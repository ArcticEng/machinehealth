import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { query } from '../db';
import { authenticate, AuthRequest, requireSubscription, SUBSCRIPTION_LEVELS, checkMachineLimit, getUserFeatures } from '../middleware/auth';

const router = Router();

// Get all machines for authenticated user
// Level 1+ required to view machines (Free users don't have machines)
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userLevel = req.user!.subscription_level || 0;
    
    // Free users can't access machines
    if (userLevel < SUBSCRIPTION_LEVELS.BASIC) {
      return res.json([]); // Return empty array for free users
    }

    const { factoryId, companyId, status } = req.query;
    
    let sql = `
      SELECT m.*, f.name as factory_name, f.location as factory_location, c.name as company_name
       FROM machines m
       JOIN factories f ON m.factory_id = f.id
       JOIN companies c ON f.company_id = c.id
       WHERE (c.owner_id = $1 OR c.id IN (SELECT company_id FROM user_companies WHERE user_id = $1))
    `;
    const params: any[] = [req.user!.id];
    let paramIndex = 2;

    if (factoryId) {
      sql += ` AND m.factory_id = $${paramIndex}`;
      params.push(factoryId);
      paramIndex++;
    }

    if (companyId) {
      sql += ` AND f.company_id = $${paramIndex}`;
      params.push(companyId);
      paramIndex++;
    }

    if (status) {
      sql += ` AND m.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    sql += ' ORDER BY m.health_score ASC, m.created_at DESC';

    const result = await query(sql, params);

    const machines = result.rows.map(row => ({
      id: row.id,
      factoryId: row.factory_id,
      factoryName: row.factory_name,
      factoryLocation: row.factory_location,
      companyName: row.company_name,
      name: row.name,
      type: row.type,
      model: row.model,
      serialNumber: row.serial_number,
      description: row.description,
      status: row.status,
      healthScore: row.health_score,
      lastMaintenanceAt: row.last_maintenance_at,
      nextMaintenanceAt: row.next_maintenance_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    res.json(machines);
  } catch (error) {
    console.error('Get machines error:', error);
    res.status(500).json({ error: 'Failed to get machines' });
  }
});

// Get single machine with details
// Level 1+ required
router.get('/:id', authenticate, requireSubscription(SUBSCRIPTION_LEVELS.BASIC), async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT m.*, f.name as factory_name, f.location as factory_location, 
              c.name as company_name, c.id as company_id
       FROM machines m
       JOIN factories f ON m.factory_id = f.id
       JOIN companies c ON f.company_id = c.id
       WHERE m.id = $1
         AND (c.owner_id = $2 OR c.id IN (SELECT company_id FROM user_companies WHERE user_id = $2))`,
      [req.params.id, req.user!.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Machine not found' });
    }

    const row = result.rows[0];

    // Get recent samples count
    const samplesCount = await query(
      `SELECT COUNT(*) FROM samples WHERE machine_id = $1`,
      [req.params.id]
    );

    // Get active baseline
    const baseline = await query(
      `SELECT * FROM baselines WHERE machine_id = $1 AND is_active = true LIMIT 1`,
      [req.params.id]
    );

    // Get recent alerts
    const alerts = await query(
      `SELECT * FROM alerts WHERE machine_id = $1 AND resolved = false ORDER BY created_at DESC LIMIT 5`,
      [req.params.id]
    );

    res.json({
      id: row.id,
      factoryId: row.factory_id,
      factoryName: row.factory_name,
      factoryLocation: row.factory_location,
      companyId: row.company_id,
      companyName: row.company_name,
      name: row.name,
      type: row.type,
      model: row.model,
      serialNumber: row.serial_number,
      description: row.description,
      status: row.status,
      healthScore: row.health_score,
      lastMaintenanceAt: row.last_maintenance_at,
      nextMaintenanceAt: row.next_maintenance_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      samplesCount: parseInt(samplesCount.rows[0].count),
      activeBaseline: baseline.rows[0] || null,
      recentAlerts: alerts.rows
    });
  } catch (error) {
    console.error('Get machine error:', error);
    res.status(500).json({ error: 'Failed to get machine' });
  }
});

// Create machine
// Level 1+ required, with machine limit check
router.post(
  '/',
  authenticate,
  requireSubscription(SUBSCRIPTION_LEVELS.BASIC),
  [
    body('factoryId').isUUID(),
    body('name').notEmpty().trim(),
    body('type').optional().trim(),
    body('model').optional().trim(),
    body('serialNumber').optional().trim(),
    body('description').optional().trim()
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userLevel = req.user!.subscription_level || 0;
      const userId = req.user!.id;

      // Check machine limit for Basic users
      const limitCheck = await checkMachineLimit(userId, userLevel);
      if (!limitCheck.allowed) {
        return res.status(403).json({
          error: 'Machine limit reached',
          message: `Your plan allows up to ${limitCheck.limit} machines. You currently have ${limitCheck.current}. Please upgrade to Premium for unlimited machines.`,
          current: limitCheck.current,
          limit: limitCheck.limit,
          requiredLevel: SUBSCRIPTION_LEVELS.PREMIUM
        });
      }

      const { factoryId, name, type, model, serialNumber, description } = req.body;

      // Verify factory access
      const accessCheck = await query(
        `SELECT f.id FROM factories f
         JOIN companies c ON f.company_id = c.id
         WHERE f.id = $1
           AND (c.owner_id = $2 OR c.id IN (SELECT company_id FROM user_companies WHERE user_id = $2))`,
        [factoryId, req.user!.id]
      );

      if (accessCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Not authorized to add machine to this factory' });
      }

      const result = await query(
        `INSERT INTO machines (factory_id, name, type, model, serial_number, description)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [factoryId, name, type || null, model || null, serialNumber || null, description || null]
      );

      res.status(201).json({
        id: result.rows[0].id,
        factoryId: result.rows[0].factory_id,
        name: result.rows[0].name,
        type: result.rows[0].type,
        model: result.rows[0].model,
        serialNumber: result.rows[0].serial_number,
        description: result.rows[0].description,
        status: result.rows[0].status,
        healthScore: result.rows[0].health_score,
        createdAt: result.rows[0].created_at,
        updatedAt: result.rows[0].updated_at
      });
    } catch (error) {
      console.error('Create machine error:', error);
      res.status(500).json({ error: 'Failed to create machine' });
    }
  }
);

// Update machine
// Level 1+ required
router.put(
  '/:id',
  authenticate,
  requireSubscription(SUBSCRIPTION_LEVELS.BASIC),
  [
    body('name').optional().trim(),
    body('type').optional().trim(),
    body('model').optional().trim(),
    body('serialNumber').optional().trim(),
    body('description').optional().trim(),
    body('status').optional().isIn(['healthy', 'warning', 'critical', 'offline']),
    body('healthScore').optional().isInt({ min: 0, max: 100 })
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const { name, type, model, serialNumber, description, status, healthScore } = req.body;

      // Check access
      const accessCheck = await query(
        `SELECT m.id FROM machines m
         JOIN factories f ON m.factory_id = f.id
         JOIN companies c ON f.company_id = c.id
         WHERE m.id = $1
           AND (c.owner_id = $2 OR c.id IN (SELECT company_id FROM user_companies WHERE user_id = $2))`,
        [req.params.id, req.user!.id]
      );

      if (accessCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Not authorized to update this machine' });
      }

      const result = await query(
        `UPDATE machines 
         SET name = COALESCE($1, name),
             type = COALESCE($2, type),
             model = COALESCE($3, model),
             serial_number = COALESCE($4, serial_number),
             description = COALESCE($5, description),
             status = COALESCE($6, status),
             health_score = COALESCE($7, health_score)
         WHERE id = $8
         RETURNING *`,
        [name, type, model, serialNumber, description, status, healthScore, req.params.id]
      );

      res.json({
        id: result.rows[0].id,
        factoryId: result.rows[0].factory_id,
        name: result.rows[0].name,
        type: result.rows[0].type,
        model: result.rows[0].model,
        serialNumber: result.rows[0].serial_number,
        description: result.rows[0].description,
        status: result.rows[0].status,
        healthScore: result.rows[0].health_score,
        createdAt: result.rows[0].created_at,
        updatedAt: result.rows[0].updated_at
      });
    } catch (error) {
      console.error('Update machine error:', error);
      res.status(500).json({ error: 'Failed to update machine' });
    }
  }
);

// Delete machine
// Level 1+ required
router.delete('/:id', authenticate, requireSubscription(SUBSCRIPTION_LEVELS.BASIC), async (req: AuthRequest, res: Response) => {
  try {
    // Check access
    const accessCheck = await query(
      `SELECT m.id FROM machines m
       JOIN factories f ON m.factory_id = f.id
       JOIN companies c ON f.company_id = c.id
       WHERE m.id = $1
         AND (c.owner_id = $2 OR c.id IN (SELECT company_id FROM user_companies WHERE user_id = $2))`,
      [req.params.id, req.user!.id]
    );

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized to delete this machine' });
    }

    await query('DELETE FROM machines WHERE id = $1', [req.params.id]);
    res.json({ message: 'Machine deleted successfully' });
  } catch (error) {
    console.error('Delete machine error:', error);
    res.status(500).json({ error: 'Failed to delete machine' });
  }
});

export default router;
