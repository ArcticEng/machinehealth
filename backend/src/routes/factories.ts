import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { query } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Get all factories for authenticated user
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { companyId } = req.query;
    
    let sql = `
      SELECT f.*, c.name as company_name,
             COUNT(DISTINCT m.id) as machine_count
       FROM factories f
       JOIN companies c ON f.company_id = c.id
       LEFT JOIN machines m ON m.factory_id = f.id
       WHERE (c.owner_id = $1 OR c.id IN (SELECT company_id FROM user_companies WHERE user_id = $1))
    `;
    const params: any[] = [req.user!.id];

    if (companyId) {
      sql += ' AND f.company_id = $2';
      params.push(companyId);
    }

    sql += ' GROUP BY f.id, c.name ORDER BY f.created_at DESC';

    const result = await query(sql, params);

    const factories = result.rows.map(row => ({
      id: row.id,
      companyId: row.company_id,
      companyName: row.company_name,
      name: row.name,
      location: row.location,
      description: row.description,
      status: row.status,
      machineCount: parseInt(row.machine_count),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    res.json(factories);
  } catch (error) {
    console.error('Get factories error:', error);
    res.status(500).json({ error: 'Failed to get factories' });
  }
});

// Get single factory
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT f.*, c.name as company_name,
              COUNT(DISTINCT m.id) as machine_count
       FROM factories f
       JOIN companies c ON f.company_id = c.id
       LEFT JOIN machines m ON m.factory_id = f.id
       WHERE f.id = $1
         AND (c.owner_id = $2 OR c.id IN (SELECT company_id FROM user_companies WHERE user_id = $2))
       GROUP BY f.id, c.name`,
      [req.params.id, req.user!.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Factory not found' });
    }

    const row = result.rows[0];
    res.json({
      id: row.id,
      companyId: row.company_id,
      companyName: row.company_name,
      name: row.name,
      location: row.location,
      description: row.description,
      status: row.status,
      machineCount: parseInt(row.machine_count),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  } catch (error) {
    console.error('Get factory error:', error);
    res.status(500).json({ error: 'Failed to get factory' });
  }
});

// Create factory
router.post(
  '/',
  authenticate,
  [
    body('companyId').isUUID(),
    body('name').notEmpty().trim(),
    body('location').optional().trim(),
    body('description').optional().trim()
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { companyId, name, location, description } = req.body;

      // Verify company ownership
      const ownerCheck = await query(
        `SELECT id FROM companies WHERE id = $1 
         AND (owner_id = $2 OR id IN (SELECT company_id FROM user_companies WHERE user_id = $2))`,
        [companyId, req.user!.id]
      );

      if (ownerCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Not authorized to add factory to this company' });
      }

      const result = await query(
        `INSERT INTO factories (company_id, name, location, description)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [companyId, name, location || null, description || null]
      );

      res.status(201).json({
        id: result.rows[0].id,
        companyId: result.rows[0].company_id,
        name: result.rows[0].name,
        location: result.rows[0].location,
        description: result.rows[0].description,
        status: result.rows[0].status,
        machineCount: 0,
        createdAt: result.rows[0].created_at,
        updatedAt: result.rows[0].updated_at
      });
    } catch (error) {
      console.error('Create factory error:', error);
      res.status(500).json({ error: 'Failed to create factory' });
    }
  }
);

// Update factory
router.put(
  '/:id',
  authenticate,
  [
    body('name').optional().trim(),
    body('location').optional().trim(),
    body('description').optional().trim(),
    body('status').optional().isIn(['operational', 'maintenance', 'offline'])
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const { name, location, description, status } = req.body;

      // Check access
      const accessCheck = await query(
        `SELECT f.id FROM factories f
         JOIN companies c ON f.company_id = c.id
         WHERE f.id = $1
           AND (c.owner_id = $2 OR c.id IN (SELECT company_id FROM user_companies WHERE user_id = $2))`,
        [req.params.id, req.user!.id]
      );

      if (accessCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Not authorized to update this factory' });
      }

      const result = await query(
        `UPDATE factories 
         SET name = COALESCE($1, name),
             location = COALESCE($2, location),
             description = COALESCE($3, description),
             status = COALESCE($4, status)
         WHERE id = $5
         RETURNING *`,
        [name, location, description, status, req.params.id]
      );

      res.json({
        id: result.rows[0].id,
        companyId: result.rows[0].company_id,
        name: result.rows[0].name,
        location: result.rows[0].location,
        description: result.rows[0].description,
        status: result.rows[0].status,
        createdAt: result.rows[0].created_at,
        updatedAt: result.rows[0].updated_at
      });
    } catch (error) {
      console.error('Update factory error:', error);
      res.status(500).json({ error: 'Failed to update factory' });
    }
  }
);

// Delete factory
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // Check access
    const accessCheck = await query(
      `SELECT f.id FROM factories f
       JOIN companies c ON f.company_id = c.id
       WHERE f.id = $1
         AND (c.owner_id = $2 OR c.id IN (SELECT company_id FROM user_companies WHERE user_id = $2))`,
      [req.params.id, req.user!.id]
    );

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized to delete this factory' });
    }

    await query('DELETE FROM factories WHERE id = $1', [req.params.id]);
    res.json({ message: 'Factory deleted successfully' });
  } catch (error) {
    console.error('Delete factory error:', error);
    res.status(500).json({ error: 'Failed to delete factory' });
  }
});

export default router;
