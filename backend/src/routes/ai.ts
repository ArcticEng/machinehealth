import { Router, Response } from 'express';
import { query } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { 
  analyzeVibrationComparison, 
  generateMaintenanceReport,
  interpretVibrationPattern 
} from '../services/claude';
import { uploadComparisonPDF } from '../services/s3';
import { generateComparisonPDF } from '../services/pdf';

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

    console.log(`AI Analysis generated for ${machineName}: ${analysis.severity}`);

    res.json(analysis);
  } catch (error) {
    console.error('AI analysis error:', error);
    res.status(500).json({ error: 'Failed to generate AI analysis' });
  }
});

// Save comparison analysis as PDF to S3
router.post('/analyze/save', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { 
      machineId, 
      baselineSampleId,
      currentSampleId,
      baselineMetrics, 
      currentMetrics,
      analysis 
    } = req.body;

    const userId = req.user!.id;

    // Get machine and related info
    const machineResult = await query(
      `SELECT m.id, m.name, m.type,
              f.id as factory_id, f.name as factory_name,
              c.id as company_id, c.name as company_name
       FROM machines m
       JOIN factories f ON m.factory_id = f.id
       JOIN companies c ON f.company_id = c.id
       WHERE m.id = $1`,
      [machineId]
    );

    if (machineResult.rows.length === 0) {
      return res.status(404).json({ error: 'Machine not found' });
    }

    const machine = machineResult.rows[0];

    // Get sample names
    let baselineName = 'Baseline';
    let baselineDate = new Date().toISOString();
    let currentName = 'Current Sample';
    let currentDate = new Date().toISOString();

    if (baselineSampleId) {
      const baselineResult = await query(
        'SELECT name, recorded_at FROM samples WHERE id = $1',
        [baselineSampleId]
      );
      if (baselineResult.rows.length > 0) {
        baselineName = baselineResult.rows[0].name;
        baselineDate = baselineResult.rows[0].recorded_at;
      }
    }

    if (currentSampleId) {
      const currentResult = await query(
        'SELECT name, recorded_at FROM samples WHERE id = $1',
        [currentSampleId]
      );
      if (currentResult.rows.length > 0) {
        currentName = currentResult.rows[0].name;
        currentDate = currentResult.rows[0].recorded_at;
      }
    }

    // Generate PDF
    const pdfBuffer = await generateComparisonPDF({
      machineName: machine.name,
      machineType: machine.type || 'Industrial Equipment',
      baselineName,
      baselineDate,
      currentSampleName: currentName,
      currentSampleDate: currentDate,
      baselineMetrics: baselineMetrics || {},
      currentMetrics: currentMetrics || {},
      analysis: analysis || {
        severity: 'unknown',
        title: 'Analysis',
        summary: 'No analysis available',
        findings: [],
        possibleCauses: [],
        recommendations: [],
        confidenceScore: 0
      }
    });

    // Upload to S3
    const filename = `comparison-${machine.name.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const { key, url } = await uploadComparisonPDF({
      userId,
      companyId: machine.company_id,
      factoryId: machine.factory_id,
      machineId: machine.id,
      filename,
      pdfBuffer,
      metadata: {
        machineName: machine.name,
        severity: analysis?.severity || 'unknown',
        baselineSampleId: baselineSampleId || '',
        currentSampleId: currentSampleId || '',
      }
    });

    // Save reference to database
    await query(
      `INSERT INTO comparisons (
        user_id, machine_id, baseline_sample_id, current_sample_id,
        severity, title, summary, s3_key, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [
        userId,
        machineId,
        baselineSampleId || null,
        currentSampleId || null,
        analysis?.severity || 'unknown',
        analysis?.title || 'Comparison Analysis',
        analysis?.summary || '',
        key
      ]
    );

    console.log(`Comparison saved to S3: ${key}`);

    res.json({
      success: true,
      s3Key: key,
      downloadUrl: url,
      message: 'Comparison saved successfully'
    });
  } catch (error) {
    console.error('Save comparison error:', error);
    res.status(500).json({ error: 'Failed to save comparison' });
  }
});

// Get saved comparisons for a machine
router.get('/comparisons', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { machineId, limit = '20' } = req.query;
    const userId = req.user!.id;

    let dbQuery = `
      SELECT c.*, m.name as machine_name
      FROM comparisons c
      JOIN machines m ON c.machine_id = m.id
      JOIN factories f ON m.factory_id = f.id
      JOIN companies co ON f.company_id = co.id
      WHERE c.user_id = $1
        AND (co.owner_id = $1 OR co.id IN (SELECT company_id FROM user_companies WHERE user_id = $1))
    `;
    const params: any[] = [userId];

    if (machineId) {
      dbQuery += ` AND c.machine_id = $${params.length + 1}`;
      params.push(machineId);
    }

    dbQuery += ` ORDER BY c.created_at DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit as string));

    const result = await query(dbQuery, params);

    const comparisons = result.rows.map(row => ({
      id: row.id,
      machineId: row.machine_id,
      machineName: row.machine_name,
      severity: row.severity,
      title: row.title,
      summary: row.summary,
      createdAt: row.created_at,
      s3Key: row.s3_key
    }));

    res.json(comparisons);
  } catch (error) {
    console.error('Get comparisons error:', error);
    res.status(500).json({ error: 'Failed to get comparisons' });
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
             m.last_maintenance_at
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
      lastMaintenance: m.last_maintenance_at
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
