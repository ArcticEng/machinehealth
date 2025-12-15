import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { query } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Get all companies for authenticated user
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT c.*, 
              COUNT(DISTINCT f.id) as factory_count,
              COUNT(DISTINCT m.id) as machine_count
       FROM companies c
       LEFT JOIN factories f ON f.company_id = c.id
       LEFT JOIN machines m ON m.factory_id = f.id
       WHERE c.owner_id = $1
          OR c.id IN (SELECT company_id FROM user_companies WHERE user_id = $1)
       GROUP BY c.id
       ORDER BY c.created_at DESC`,
      [req.user!.id]
    );

    const companies = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      status: row.status,
      factoryCount: parseInt(row.factory_count),
      machineCount: parseInt(row.machine_count),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    res.json(companies);
  } catch (error) {
    console.error('Get companies error:', error);
    res.status(500).json({ error: 'Failed to get companies' });
  }
});

// Get single company
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT c.*, 
              COUNT(DISTINCT f.id) as factory_count,
              COUNT(DISTINCT m.id) as machine_count
       FROM companies c
       LEFT JOIN factories f ON f.company_id = c.id
       LEFT JOIN machines m ON m.factory_id = f.id
       WHERE c.id = $1
         AND (c.owner_id = $2 OR c.id IN (SELECT company_id FROM user_companies WHERE user_id = $2))
       GROUP BY c.id`,
      [req.params.id, req.user!.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const row = result.rows[0];
    res.json({
      id: row.id,
      name: row.name,
      description: row.description,
      status: row.status,
      factoryCount: parseInt(row.factory_count),
      machineCount: parseInt(row.machine_count),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  } catch (error) {
    console.error('Get company error:', error);
    res.status(500).json({ error: 'Failed to get company' });
  }
});

// Create company
router.post(
  '/',
  authenticate,
  [
    body('name').notEmpty().trim(),
    body('description').optional().trim()
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, description } = req.body;

      const result = await query(
        `INSERT INTO companies (name, description, owner_id)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [name, description || null, req.user!.id]
      );

      res.status(201).json({
        id: result.rows[0].id,
        name: result.rows[0].name,
        description: result.rows[0].description,
        status: result.rows[0].status,
        factoryCount: 0,
        machineCount: 0,
        createdAt: result.rows[0].created_at,
        updatedAt: result.rows[0].updated_at
      });
    } catch (error) {
      console.error('Create company error:', error);
      res.status(500).json({ error: 'Failed to create company' });
    }
  }
);

// Update company
router.put(
  '/:id',
  authenticate,
  [
    body('name').optional().trim(),
    body('description').optional().trim(),
    body('status').optional().isIn(['active', 'inactive', 'maintenance'])
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const { name, description, status } = req.body;

      // Check ownership
      const ownerCheck = await query(
        'SELECT id FROM companies WHERE id = $1 AND owner_id = $2',
        [req.params.id, req.user!.id]
      );

      if (ownerCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Not authorized to update this company' });
      }

      const result = await query(
        `UPDATE companies 
         SET name = COALESCE($1, name),
             description = COALESCE($2, description),
             status = COALESCE($3, status)
         WHERE id = $4
         RETURNING *`,
        [name, description, status, req.params.id]
      );

      res.json({
        id: result.rows[0].id,
        name: result.rows[0].name,
        description: result.rows[0].description,
        status: result.rows[0].status,
        createdAt: result.rows[0].created_at,
        updatedAt: result.rows[0].updated_at
      });
    } catch (error) {
      console.error('Update company error:', error);
      res.status(500).json({ error: 'Failed to update company' });
    }
  }
);

// Delete company
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // Check ownership
    const ownerCheck = await query(
      'SELECT id FROM companies WHERE id = $1 AND owner_id = $2',
      [req.params.id, req.user!.id]
    );

    if (ownerCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized to delete this company' });
    }

    await query('DELETE FROM companies WHERE id = $1', [req.params.id]);
    res.json({ message: 'Company deleted successfully' });
  } catch (error) {
    console.error('Delete company error:', error);
    res.status(500).json({ error: 'Failed to delete company' });
  }
});

export default router;
