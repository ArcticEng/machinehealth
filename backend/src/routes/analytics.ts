import { Router, Response } from 'express';
import { query } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Get dashboard overview
router.get('/dashboard', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // Get counts
    const companiesResult = await query(
      `SELECT COUNT(*) FROM companies c
       WHERE c.owner_id = $1 OR c.id IN (SELECT company_id FROM user_companies WHERE user_id = $1)`,
      [req.user!.id]
    );

    const factoriesResult = await query(
      `SELECT COUNT(*) FROM factories f
       JOIN companies c ON f.company_id = c.id
       WHERE c.owner_id = $1 OR c.id IN (SELECT company_id FROM user_companies WHERE user_id = $1)`,
      [req.user!.id]
    );

    const machinesResult = await query(
      `SELECT COUNT(*), 
              COUNT(*) FILTER (WHERE m.status = 'healthy') as healthy,
              COUNT(*) FILTER (WHERE m.status = 'warning') as warning,
              COUNT(*) FILTER (WHERE m.status = 'critical') as critical,
              COALESCE(AVG(m.health_score), 100) as avg_health
       FROM machines m
       JOIN factories f ON m.factory_id = f.id
       JOIN companies c ON f.company_id = c.id
       WHERE c.owner_id = $1 OR c.id IN (SELECT company_id FROM user_companies WHERE user_id = $1)`,
      [req.user!.id]
    );

    const alertsResult = await query(
      `SELECT COUNT(*) FILTER (WHERE resolved = false) as unresolved,
              COUNT(*) FILTER (WHERE severity = 'high' AND resolved = false) as critical_alerts
       FROM alerts a
       JOIN machines m ON a.machine_id = m.id
       JOIN factories f ON m.factory_id = f.id
       JOIN companies c ON f.company_id = c.id
       WHERE c.owner_id = $1 OR c.id IN (SELECT company_id FROM user_companies WHERE user_id = $1)`,
      [req.user!.id]
    );

    const machineStats = machinesResult.rows[0];
    const alertStats = alertsResult.rows[0];

    res.json({
      companies: parseInt(companiesResult.rows[0].count),
      factories: parseInt(factoriesResult.rows[0].count),
      machines: {
        total: parseInt(machineStats.count),
        healthy: parseInt(machineStats.healthy),
        warning: parseInt(machineStats.warning),
        critical: parseInt(machineStats.critical)
      },
      overallHealth: Math.round(parseFloat(machineStats.avg_health)),
      alerts: {
        unresolved: parseInt(alertStats.unresolved),
        critical: parseInt(alertStats.critical_alerts)
      }
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ error: 'Failed to get dashboard data' });
  }
});

// Get health trends
router.get('/health-trends', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { machineId, period = 'week' } = req.query;

    let interval = '7 days';
    let groupBy = 'day';
    
    switch (period) {
      case 'day':
        interval = '1 day';
        groupBy = 'hour';
        break;
      case 'week':
        interval = '7 days';
        groupBy = 'day';
        break;
      case 'month':
        interval = '30 days';
        groupBy = 'day';
        break;
      case 'year':
        interval = '365 days';
        groupBy = 'month';
        break;
    }

    let sql: string;
    let params: any[];

    if (machineId) {
      sql = `
        SELECT DATE_TRUNC('${groupBy}', s.recorded_at) as time_bucket,
               AVG((s.metrics->>'rmsX')::float) as avg_rms_x,
               AVG((s.metrics->>'rmsY')::float) as avg_rms_y,
               AVG((s.metrics->>'rmsZ')::float) as avg_rms_z
        FROM samples s
        WHERE s.machine_id = $1 AND s.recorded_at > NOW() - INTERVAL '${interval}'
        GROUP BY time_bucket
        ORDER BY time_bucket
      `;
      params = [machineId];
    } else {
      sql = `
        SELECT DATE_TRUNC('${groupBy}', s.recorded_at) as time_bucket,
               AVG((s.metrics->>'rmsX')::float) as avg_rms_x,
               AVG((s.metrics->>'rmsY')::float) as avg_rms_y,
               AVG((s.metrics->>'rmsZ')::float) as avg_rms_z,
               COUNT(DISTINCT s.machine_id) as machines_sampled
        FROM samples s
        JOIN machines m ON s.machine_id = m.id
        JOIN factories f ON m.factory_id = f.id
        JOIN companies c ON f.company_id = c.id
        WHERE (c.owner_id = $1 OR c.id IN (SELECT company_id FROM user_companies WHERE user_id = $1))
          AND s.recorded_at > NOW() - INTERVAL '${interval}'
        GROUP BY time_bucket
        ORDER BY time_bucket
      `;
      params = [req.user!.id];
    }

    const result = await query(sql, params);

    res.json(result.rows.map(row => ({
      time: row.time_bucket,
      avgRmsX: parseFloat(row.avg_rms_x) || 0,
      avgRmsY: parseFloat(row.avg_rms_y) || 0,
      avgRmsZ: parseFloat(row.avg_rms_z) || 0,
      machinesSampled: row.machines_sampled ? parseInt(row.machines_sampled) : undefined
    })));
  } catch (error) {
    console.error('Get health trends error:', error);
    res.status(500).json({ error: 'Failed to get health trends' });
  }
});

// Compare sample to baseline
router.get('/compare/:sampleId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // Get sample
    const sampleResult = await query(
      `SELECT s.* FROM samples s
       JOIN machines m ON s.machine_id = m.id
       JOIN factories f ON m.factory_id = f.id
       JOIN companies c ON f.company_id = c.id
       WHERE s.id = $1
         AND (c.owner_id = $2 OR c.id IN (SELECT company_id FROM user_companies WHERE user_id = $2))`,
      [req.params.sampleId, req.user!.id]
    );

    if (sampleResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sample not found' });
    }

    const sample = sampleResult.rows[0];

    // Get baseline
    const baselineResult = await query(
      `SELECT b.*, s.raw_data as baseline_raw_data FROM baselines b
       LEFT JOIN samples s ON b.sample_id = s.id
       WHERE b.machine_id = $1 AND b.is_active = true`,
      [sample.machine_id]
    );

    if (baselineResult.rows.length === 0) {
      return res.json({
        sample: {
          id: sample.id,
          name: sample.name,
          metrics: sample.metrics,
          rawData: sample.raw_data,
          recordedAt: sample.recorded_at
        },
        baseline: null,
        comparison: null
      });
    }

    const baseline = baselineResult.rows[0];

    // Calculate comparison metrics
    const sampleMetrics = sample.metrics || {};
    const baselineMetrics = baseline.metrics || {};

    const comparison = {
      rmsX: calculateDeviation(sampleMetrics.rmsX, baselineMetrics.rmsX),
      rmsY: calculateDeviation(sampleMetrics.rmsY, baselineMetrics.rmsY),
      rmsZ: calculateDeviation(sampleMetrics.rmsZ, baselineMetrics.rmsZ),
      peakX: calculateDeviation(sampleMetrics.peakX, baselineMetrics.peakX),
      peakY: calculateDeviation(sampleMetrics.peakY, baselineMetrics.peakY),
      peakZ: calculateDeviation(sampleMetrics.peakZ, baselineMetrics.peakZ),
      crestFactorX: calculateDeviation(sampleMetrics.crestFactorX, baselineMetrics.crestFactorX),
      crestFactorY: calculateDeviation(sampleMetrics.crestFactorY, baselineMetrics.crestFactorY),
      crestFactorZ: calculateDeviation(sampleMetrics.crestFactorZ, baselineMetrics.crestFactorZ),
    };

    res.json({
      sample: {
        id: sample.id,
        name: sample.name,
        metrics: sample.metrics,
        rawData: sample.raw_data,
        recordedAt: sample.recorded_at
      },
      baseline: {
        id: baseline.id,
        name: baseline.name,
        metrics: baseline.metrics,
        rawData: baseline.baseline_raw_data,
        createdAt: baseline.created_at
      },
      comparison
    });
  } catch (error) {
    console.error('Compare error:', error);
    res.status(500).json({ error: 'Failed to compare sample' });
  }
});

// Get machines needing maintenance
router.get('/maintenance-due', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT m.*, f.name as factory_name
       FROM machines m
       JOIN factories f ON m.factory_id = f.id
       JOIN companies c ON f.company_id = c.id
       WHERE (c.owner_id = $1 OR c.id IN (SELECT company_id FROM user_companies WHERE user_id = $1))
         AND (m.health_score < 70 OR m.next_maintenance_at < NOW() + INTERVAL '7 days')
       ORDER BY m.health_score ASC`,
      [req.user!.id]
    );

    res.json(result.rows.map(row => ({
      id: row.id,
      name: row.name,
      factoryName: row.factory_name,
      type: row.type,
      healthScore: row.health_score,
      status: row.status,
      lastMaintenanceAt: row.last_maintenance_at,
      nextMaintenanceAt: row.next_maintenance_at
    })));
  } catch (error) {
    console.error('Get maintenance due error:', error);
    res.status(500).json({ error: 'Failed to get maintenance data' });
  }
});

function calculateDeviation(current: number | undefined, baseline: number | undefined): number | null {
  if (current === undefined || baseline === undefined || baseline === 0) {
    return null;
  }
  return ((current - baseline) / baseline) * 100;
}

export default router;
