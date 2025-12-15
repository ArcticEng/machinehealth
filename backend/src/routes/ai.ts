import { Router, Response } from 'express';
import { query } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { 
  analyzeVibrationComparison, 
  generateMaintenanceReport,
  interpretVibrationPattern 
} from '../services/claude';

const router = Router();

// Analyze vibration comparison with AI
router.post('/analyze', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { sampleId, machineId, baselineMetrics, currentMetrics } = req.body;

    // Get machine info
    let machineName = 'Unknown Machine';
    let machineType = 'Industrial Equipment';
    
    if (machineId) {
      const machineResult = await query(
        'SELECT name, type FROM machines WHERE id = $1',
        [machineId]
      );
      if (machineResult.rows.length > 0) {
        machineName = machineResult.rows[0].name;
        machineType = machineResult.rows[0].type || 'Industrial Equipment';
      }
    }

    // Get historical context (recent samples)
    let historicalContext = '';
    if (machineId) {
      const recentSamples = await query(
        `SELECT recorded_at, metrics FROM samples 
         WHERE machine_id = $1 
         ORDER BY recorded_at DESC LIMIT 5`,
        [machineId]
      );
      if (recentSamples.rows.length > 1) {
        historicalContext = `Machine has ${recentSamples.rows.length} recent recordings. `;
        const metrics = recentSamples.rows.map(r => r.metrics?.rmsX || 0);
        const trend = metrics[0] > metrics[metrics.length - 1] ? 'increasing' : 'stable';
        historicalContext += `Vibration trend: ${trend}.`;
      }
    }

    const analysis = await analyzeVibrationComparison(
      machineName,
      machineType,
      baselineMetrics || {},
      currentMetrics || {},
      historicalContext
    );

    // Log the analysis
    console.log(`AI Analysis generated for ${machineName}: ${analysis.severity}`);

    res.json(analysis);
  } catch (error) {
    console.error('AI analysis error:', error);
    res.status(500).json({ error: 'Failed to generate AI analysis' });
  }
});

// Generate comprehensive report with AI
router.post('/report', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { companyId, factoryId, period } = req.body;
    const userId = req.user!.id;

    // Get machines based on filters
    let machineQuery = `
      SELECT m.id, m.name, m.type, m.status, m.health_score,
             f.name as factory_name, f.id as factory_id,
             c.name as company_name, c.id as company_id,
             m.last_maintenance
      FROM machines m
      JOIN factories f ON m.factory_id = f.id
      JOIN companies c ON f.company_id = c.id
      WHERE (c.owner_id = $1 OR c.id IN (SELECT company_id FROM user_companies WHERE user_id = $1))
    `;
    const params: any[] = [userId];
    
    if (factoryId && factoryId !== 'all') {
      machineQuery += ` AND m.factory_id = $${params.length + 1}`;
      params.push(factoryId);
    } else if (companyId && companyId !== 'all') {
      machineQuery += ` AND c.id = $${params.length + 1}`;
      params.push(companyId);
    }

    const machinesResult = await query(machineQuery, params);
    const machines = machinesResult.rows.map(m => ({
      name: m.name,
      type: m.type,
      healthScore: m.health_score || 100,
      status: m.status,
      factoryName: m.factory_name,
      lastMaintenance: m.last_maintenance
    }));

    // Get alerts
    let alertQuery = `
      SELECT a.severity, a.message as description, m.name as machine_name
      FROM alerts a
      JOIN machines m ON a.machine_id = m.id
      JOIN factories f ON m.factory_id = f.id
      JOIN companies c ON f.company_id = c.id
      WHERE (c.owner_id = $1 OR c.id IN (SELECT company_id FROM user_companies WHERE user_id = $1))
        AND a.resolved = false
      ORDER BY a.created_at DESC
      LIMIT 20
    `;
    
    const alertsResult = await query(alertQuery, [userId]);
    const alerts = alertsResult.rows.map(a => ({
      severity: a.severity,
      machineName: a.machine_name,
      description: a.description
    }));

    // Get company name if filtered
    let companyName = 'All Companies';
    if (companyId && companyId !== 'all') {
      const companyResult = await query('SELECT name FROM companies WHERE id = $1', [companyId]);
      if (companyResult.rows.length > 0) {
        companyName = companyResult.rows[0].name;
      }
    }

    const periodLabel = period === 'day' ? 'Last 24 Hours' :
                       period === 'week' ? 'Last 7 Days' :
                       period === 'month' ? 'Last 30 Days' :
                       period === 'quarter' ? 'Last Quarter' : period;

    const report = await generateMaintenanceReport(
      machines,
      alerts,
      periodLabel,
      companyName
    );

    // Add machine health stats
    const healthy = machines.filter(m => m.healthScore >= 90).length;
    const warning = machines.filter(m => m.healthScore >= 70 && m.healthScore < 90).length;
    const critical = machines.filter(m => m.healthScore < 70).length;
    const avgScore = machines.length > 0
      ? Math.round(machines.reduce((sum, m) => sum + m.healthScore, 0) / machines.length)
      : 100;

    res.json({
      ...report,
      machineHealth: {
        total: machines.length,
        healthy,
        warning,
        critical,
        averageScore: avgScore
      },
      alerts: {
        total: alerts.length,
        critical: alerts.filter(a => a.severity === 'high').length
      },
      machines: machines.map(m => ({
        name: m.name,
        factory: m.factoryName,
        health: m.healthScore,
        status: m.status,
        trend: m.healthScore > 85 ? 'stable' : m.healthScore > 70 ? 'declining' : 'critical'
      }))
    });
  } catch (error) {
    console.error('Report generation error:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// Interpret raw vibration data pattern
router.post('/interpret', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { rawData, machineType } = req.body;

    if (!rawData || !Array.isArray(rawData) || rawData.length === 0) {
      return res.status(400).json({ error: 'Raw data is required' });
    }

    const interpretation = await interpretVibrationPattern(
      rawData,
      machineType || 'Industrial Equipment'
    );

    res.json(interpretation);
  } catch (error) {
    console.error('Pattern interpretation error:', error);
    res.status(500).json({ error: 'Failed to interpret pattern' });
  }
});

// Quick health assessment
router.post('/assess', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { machineId } = req.body;

    // Get machine with recent samples
    const machineResult = await query(
      `SELECT m.*, f.name as factory_name
       FROM machines m
       JOIN factories f ON m.factory_id = f.id
       WHERE m.id = $1`,
      [machineId]
    );

    if (machineResult.rows.length === 0) {
      return res.status(404).json({ error: 'Machine not found' });
    }

    const machine = machineResult.rows[0];

    // Get latest sample and baseline
    const samplesResult = await query(
      `SELECT s.*, b.id as baseline_id
       FROM samples s
       LEFT JOIN baselines b ON s.id = b.sample_id AND b.is_active = true
       WHERE s.machine_id = $1
       ORDER BY s.recorded_at DESC
       LIMIT 2`,
      [machineId]
    );

    if (samplesResult.rows.length === 0) {
      return res.json({
        status: 'unknown',
        message: 'No samples recorded for this machine yet',
        recommendation: 'Record a baseline sample to enable health assessment'
      });
    }

    const latestSample = samplesResult.rows[0];
    const baselineSample = samplesResult.rows.find(s => s.baseline_id) || samplesResult.rows[1];

    if (!baselineSample) {
      return res.json({
        status: 'unknown',
        message: 'No baseline established for comparison',
        recommendation: 'Set a baseline sample to enable comparison analysis'
      });
    }

    // Quick analysis
    const analysis = await analyzeVibrationComparison(
      machine.name,
      machine.type || 'Industrial Equipment',
      baselineSample.metrics || {},
      latestSample.metrics || {}
    );

    res.json({
      machine: {
        name: machine.name,
        type: machine.type,
        factory: machine.factory_name,
        currentHealth: machine.health_score
      },
      assessment: analysis
    });
  } catch (error) {
    console.error('Health assessment error:', error);
    res.status(500).json({ error: 'Failed to assess machine health' });
  }
});

export default router;
