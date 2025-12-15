import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { query } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Get baselines for a machine
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { machineId } = req.query;

    if (!machineId) {
      return res.status(400).json({ error: 'machineId is required' });
    }

    const accessCheck = await query(
      `SELECT m.id FROM machines m
       JOIN factories f ON m.factory_id = f.id
       JOIN companies c ON f.company_id = c.id
       WHERE m.id = $1
         AND (c.owner_id = $2 OR c.id IN (SELECT company_id FROM user_companies WHERE user_id = $2))`,
      [machineId, req.user!.id]
    );

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const result = await query(
      `SELECT b.*, u.first_name, u.last_name
       FROM baselines b
       LEFT JOIN users u ON b.created_by = u.id
       WHERE b.machine_id = $1
       ORDER BY b.created_at DESC`,
      [machineId]
    );

    res.json(result.rows.map(row => ({
      id: row.id,
      machineId: row.machine_id,
      sampleId: row.sample_id,
      name: row.name,
      notes: row.notes,
      metrics: row.metrics,
      isActive: row.is_active,
      createdBy: row.first_name ? `${row.first_name} ${row.last_name || ''}`.trim() : null,
      createdAt: row.created_at
    })));
  } catch (error) {
    console.error('Get baselines error:', error);
    res.status(500).json({ error: 'Failed to get baselines' });
  }
});

// Get active baseline
router.get('/active/:machineId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT b.*, s.raw_data FROM baselines b
       LEFT JOIN samples s ON b.sample_id = s.id
       JOIN machines m ON b.machine_id = m.id
       JOIN factories f ON m.factory_id = f.id
       JOIN companies c ON f.company_id = c.id
       WHERE b.machine_id = $1 AND b.is_active = true
         AND (c.owner_id = $2 OR c.id IN (SELECT company_id FROM user_companies WHERE user_id = $2))
       LIMIT 1`,
      [req.params.machineId, req.user!.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No active baseline found' });
    }

    const row = result.rows[0];
    res.json({
      id: row.id,
      machineId: row.machine_id,
      sampleId: row.sample_id,
      name: row.name,
      metrics: row.metrics,
      rawData: row.raw_data,
      isActive: row.is_active,
      createdAt: row.created_at
    });
  } catch (error) {
    console.error('Get active baseline error:', error);
    res.status(500).json({ error: 'Failed to get baseline' });
  }
});

// Set active baseline
router.post(
  '/set-active',
  authenticate,
  [body('machineId').isUUID(), body('sampleId').isUUID()],
  async (req: AuthRequest, res: Response) => {
    try {
      const { machineId, sampleId } = req.body;

      // Verify access
      const sampleCheck = await query(
        `SELECT s.* FROM samples s
         JOIN machines m ON s.machine_id = m.id
         JOIN factories f ON m.factory_id = f.id
         JOIN companies c ON f.company_id = c.id
         WHERE s.id = $1 AND s.machine_id = $2
           AND (c.owner_id = $3 OR c.id IN (SELECT company_id FROM user_companies WHERE user_id = $3))`,
        [sampleId, machineId, req.user!.id]
      );

      if (sampleCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Sample not found' });
      }

      const sample = sampleCheck.rows[0];

      // Deactivate existing baselines
      await query('UPDATE baselines SET is_active = false WHERE machine_id = $1', [machineId]);

      // Create new baseline
      const result = await query(
        `INSERT INTO baselines (machine_id, sample_id, name, metrics, created_by, is_active)
         VALUES ($1, $2, $3, $4, $5, true)
         RETURNING *`,
        [machineId, sampleId, sample.name, sample.metrics, req.user!.id]
      );

      // Update sample
      await query('UPDATE samples SET is_baseline = true WHERE id = $1', [sampleId]);

      res.status(201).json({
        id: result.rows[0].id,
        machineId: result.rows[0].machine_id,
        sampleId: result.rows[0].sample_id,
        name: result.rows[0].name,
        metrics: result.rows[0].metrics,
        isActive: true,
        createdAt: result.rows[0].created_at
      });
    } catch (error) {
      console.error('Set baseline error:', error);
      res.status(500).json({ error: 'Failed to set baseline' });
    }
  }
);

export default router;
