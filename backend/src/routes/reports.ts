import { Router, Response } from 'express';
import { query } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { uploadReportPDF, getSignedDownloadUrl, deleteReport } from '../services/s3';
import { generateMaintenanceReport } from '../services/claude';
import { generateReportPDF } from '../services/pdf';

const router = Router();

// Generate and save a new report as PDF
router.post('/generate', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { companyId, factoryId, machineId, period, includeAiAnalysis = true } = req.body;
    const userId = req.user!.id;

    // Get company name for the report
    let companyName = 'All Companies';
    let factoryName: string | undefined;
    
    if (companyId && companyId !== 'all') {
      const companyResult = await query('SELECT name FROM companies WHERE id = $1', [companyId]);
      if (companyResult.rows.length > 0) {
        companyName = companyResult.rows[0].name;
      }
    }

    if (factoryId && factoryId !== 'all') {
      const factoryResult = await query('SELECT name FROM factories WHERE id = $1', [factoryId]);
      if (factoryResult.rows.length > 0) {
        factoryName = factoryResult.rows[0].name;
      }
    }

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

    if (machineId && machineId !== 'all') {
      machineQuery += ` AND m.id = $${params.length + 1}`;
      params.push(machineId);
    } else if (factoryId && factoryId !== 'all') {
      machineQuery += ` AND m.factory_id = $${params.length + 1}`;
      params.push(factoryId);
    } else if (companyId && companyId !== 'all') {
      machineQuery += ` AND c.id = $${params.length + 1}`;
      params.push(companyId);
    }

    const machinesResult = await query(machineQuery, params);
    const machines = machinesResult.rows.map((m: any) => ({
      name: m.name,
      type: m.type,
      healthScore: m.health_score || 100,
      status: m.status,
      factoryName: m.factory_name,
      lastMaintenance: m.last_maintenance_at
    }));

    // Get alerts
    const alertsResult = await query(
      `SELECT a.severity, a.message as description, m.name as machine_name
       FROM alerts a
       JOIN machines m ON a.machine_id = m.id
       JOIN factories f ON m.factory_id = f.id
       JOIN companies c ON f.company_id = c.id
       WHERE (c.owner_id = $1 OR c.id IN (SELECT company_id FROM user_companies WHERE user_id = $1))
         AND a.resolved = false
       ORDER BY a.created_at DESC
       LIMIT 20`,
      [userId]
    );
    const alerts = alertsResult.rows.map((a: any) => ({
      severity: a.severity,
      machineName: a.machine_name,
      description: a.description
    }));

    const periodLabel = period === 'day' ? 'Last 24 Hours' :
                       period === 'week' ? 'Last 7 Days' :
                       period === 'month' ? 'Last 30 Days' :
                       period === 'quarter' ? 'Last Quarter' : period;

    // Generate AI-powered report
    let report;
    if (includeAiAnalysis) {
      report = await generateMaintenanceReport(machines, alerts, periodLabel, companyName);
    } else {
      // Generate basic report without AI
      const healthy = machines.filter((m: any) => m.healthScore >= 90).length;
      const warning = machines.filter((m: any) => m.healthScore >= 70 && m.healthScore < 90).length;
      const critical = machines.filter((m: any) => m.healthScore < 70).length;
      const avgScore = machines.length > 0
        ? Math.round(machines.reduce((sum: number, m: any) => sum + m.healthScore, 0) / machines.length)
        : 100;

      report = {
        title: `Machine Health Report - ${periodLabel}`,
        executiveSummary: `Report covers ${machines.length} machines with average health of ${avgScore}%.`,
        healthOverview: `${healthy} healthy, ${warning} warning, ${critical} critical.`,
        criticalFindings: critical > 0 ? [`${critical} machines need attention`] : ['No critical issues'],
        recommendations: ['Continue regular monitoring'],
        maintenancePriorities: ['Review critical machines first'],
        predictiveInsights: 'Regular maintenance recommended.',
        generatedAt: new Date().toISOString()
      };
    }

    // Calculate machine health stats
    const healthy = machines.filter((m: any) => m.healthScore >= 90).length;
    const warning = machines.filter((m: any) => m.healthScore >= 70 && m.healthScore < 90).length;
    const critical = machines.filter((m: any) => m.healthScore < 70).length;
    const avgScore = machines.length > 0
      ? Math.round(machines.reduce((sum: number, m: any) => sum + m.healthScore, 0) / machines.length)
      : 100;

    // Prepare full report data
    const fullReport = {
      title: report.title || `Machine Health Report - ${periodLabel}`,
      generatedAt: report.generatedAt || new Date().toISOString(),
      period: periodLabel,
      companyName,
      factoryName,
      executiveSummary: report.executiveSummary,
      healthOverview: report.healthOverview,
      machineHealth: {
        total: machines.length,
        healthy,
        warning,
        critical,
        averageScore: avgScore
      },
      alerts: {
        total: alerts.length,
        critical: alerts.filter((a: any) => a.severity === 'high').length
      },
      criticalFindings: report.criticalFindings || [],
      recommendations: report.recommendations || [],
      maintenancePriorities: report.maintenancePriorities || [],
      predictiveInsights: report.predictiveInsights,
      machines: machines.map((m: any) => ({
        name: m.name,
        factory: m.factoryName,
        health: m.healthScore,
        status: m.status,
        trend: m.healthScore > 85 ? 'stable' : m.healthScore > 70 ? 'declining' : 'critical'
      }))
    };

    // Generate PDF
    const pdfBuffer = await generateReportPDF(fullReport);

    // Upload PDF to S3
    const filename = `report-${period}-${Date.now()}`;
    const { key, url } = await uploadReportPDF({
      userId,
      companyId: companyId !== 'all' ? companyId : undefined,
      factoryId: factoryId !== 'all' ? factoryId : undefined,
      machineId: machineId !== 'all' ? machineId : undefined,
      filename,
      pdfBuffer,
      metadata: {
        reportType: 'maintenance',
        period,
        machineCount: String(machines.length),
        avgHealth: String(avgScore)
      }
    });

    // Save report reference to database
    await query(
      `INSERT INTO reports (user_id, company_id, factory_id, machine_id, s3_key, filename, period, summary, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [
        userId,
        companyId !== 'all' ? companyId : null,
        factoryId !== 'all' ? factoryId : null,
        machineId !== 'all' ? machineId : null,
        key,
        filename + '.pdf',
        period,
        fullReport.executiveSummary
      ]
    );

    console.log(`Report PDF saved to S3: ${key}`);

    res.json({
      ...fullReport,
      s3Key: key,
      downloadUrl: url
    });
  } catch (error) {
    console.error('Report generation error:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// List saved reports
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { companyId, factoryId, machineId, limit = '20' } = req.query;

    // Get reports from database
    let dbQuery = `
      SELECT r.*, c.name as company_name, f.name as factory_name, m.name as machine_name
      FROM reports r
      LEFT JOIN companies c ON r.company_id = c.id
      LEFT JOIN factories f ON r.factory_id = f.id
      LEFT JOIN machines m ON r.machine_id = m.id
      WHERE r.user_id = $1
    `;
    const params: any[] = [userId];

    if (companyId && companyId !== 'all') {
      dbQuery += ` AND r.company_id = $${params.length + 1}`;
      params.push(companyId);
    }
    if (factoryId && factoryId !== 'all') {
      dbQuery += ` AND r.factory_id = $${params.length + 1}`;
      params.push(factoryId);
    }
    if (machineId && machineId !== 'all') {
      dbQuery += ` AND r.machine_id = $${params.length + 1}`;
      params.push(machineId);
    }

    dbQuery += ` ORDER BY r.created_at DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit as string));

    const result = await query(dbQuery, params);

    // Generate download URLs for each report
    const reports = await Promise.all(
      result.rows.map(async (r: any) => ({
        id: r.id,
        filename: r.filename,
        period: r.period,
        summary: r.summary,
        companyName: r.company_name || 'All Companies',
        factoryName: r.factory_name,
        machineName: r.machine_name,
        createdAt: r.created_at,
        downloadUrl: await getSignedDownloadUrl(r.s3_key)
      }))
    );

    res.json(reports);
  } catch (error) {
    console.error('List reports error:', error);
    res.status(500).json({ error: 'Failed to list reports' });
  }
});

// Get a specific report
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const result = await query(
      'SELECT * FROM reports WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const report = result.rows[0];
    const downloadUrl = await getSignedDownloadUrl(report.s3_key);

    res.json({
      id: report.id,
      filename: report.filename,
      period: report.period,
      summary: report.summary,
      createdAt: report.created_at,
      downloadUrl
    });
  } catch (error) {
    console.error('Get report error:', error);
    res.status(500).json({ error: 'Failed to get report' });
  }
});

// Download report (redirect to S3 signed URL)
router.get('/:id/download', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const result = await query(
      'SELECT s3_key FROM reports WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const downloadUrl = await getSignedDownloadUrl(result.rows[0].s3_key);
    res.redirect(downloadUrl);
  } catch (error) {
    console.error('Download report error:', error);
    res.status(500).json({ error: 'Failed to download report' });
  }
});

// Delete a report
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const result = await query(
      'SELECT s3_key FROM reports WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Delete from S3
    await deleteReport(result.rows[0].s3_key);

    // Delete from database
    await query('DELETE FROM reports WHERE id = $1', [id]);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete report error:', error);
    res.status(500).json({ error: 'Failed to delete report' });
  }
});

export default router;
