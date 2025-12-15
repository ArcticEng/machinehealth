import { Router, Response } from 'express';
import { body } from 'express-validator';
import { query } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Get alerts
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { machineId, resolved, severity, limit = 50 } = req.query;

    let sql = `
      SELECT a.*, m.name as machine_name, f.name as factory_name
      FROM alerts a
      JOIN machines m ON a.machine_id = m.id
      JOIN factories f ON m.factory_id = f.id
      JOIN companies c ON f.company_id = c.id
      WHERE (c.owner_id = $1 OR c.id IN (SELECT company_id FROM user_companies WHERE user_id = $1))
    `;
    const params: any[] = [req.user!.id];
    let paramIndex = 2;

    if (machineId) {
      sql += ` AND a.machine_id = $${paramIndex}`;
      params.push(machineId);
      paramIndex++;
    }

    if (resolved !== undefined) {
      sql += ` AND a.resolved = $${paramIndex}`;
      params.push(resolved === 'true');
      paramIndex++;
    }

    if (severity) {
      sql += ` AND a.severity = $${paramIndex}`;
      params.push(severity);
      paramIndex++;
    }

    sql += ` ORDER BY a.created_at DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const result = await query(sql, params);

    res.json(result.rows.map(row => ({
      id: row.id,
      machineId: row.machine_id,
      machineName: row.machine_name,
      factoryName: row.factory_name,
      sampleId: row.sample_id,
      type: row.type,
      severity: row.severity,
      title: row.title,
      description: row.description,
      recommendation: row.recommendation,
      isAcknowledged: row.is_acknowledged,
      resolved: row.resolved,
      createdAt: row.created_at
    })));
  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({ error: 'Failed to get alerts' });
  }
});

// Acknowledge alert
router.put('/:id/acknowledge', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `UPDATE alerts SET is_acknowledged = true, acknowledged_by = $1, acknowledged_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [req.user!.id, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    res.json({ message: 'Alert acknowledged', alert: result.rows[0] });
  } catch (error) {
    console.error('Acknowledge alert error:', error);
    res.status(500).json({ error: 'Failed to acknowledge alert' });
  }
});

// Resolve alert
router.put('/:id/resolve', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `UPDATE alerts SET resolved = true, resolved_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    res.json({ message: 'Alert resolved', alert: result.rows[0] });
  } catch (error) {
    console.error('Resolve alert error:', error);
    res.status(500).json({ error: 'Failed to resolve alert' });
  }
});

// Get alert counts by severity
router.get('/summary', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT 
        COUNT(*) FILTER (WHERE severity = 'high' AND resolved = false) as critical_count,
        COUNT(*) FILTER (WHERE severity = 'medium' AND resolved = false) as warning_count,
        COUNT(*) FILTER (WHERE severity = 'low' AND resolved = false) as info_count,
        COUNT(*) FILTER (WHERE resolved = false) as total_unresolved
       FROM alerts a
       JOIN machines m ON a.machine_id = m.id
       JOIN factories f ON m.factory_id = f.id
       JOIN companies c ON f.company_id = c.id
       WHERE (c.owner_id = $1 OR c.id IN (SELECT company_id FROM user_companies WHERE user_id = $1))`,
      [req.user!.id]
    );

    const row = result.rows[0];
    res.json({
      critical: parseInt(row.critical_count),
      warning: parseInt(row.warning_count),
      info: parseInt(row.info_count),
      totalUnresolved: parseInt(row.total_unresolved)
    });
  } catch (error) {
    console.error('Get alert summary error:', error);
    res.status(500).json({ error: 'Failed to get alert summary' });
  }
});

export default router;
