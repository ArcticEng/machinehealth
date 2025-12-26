import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { query } from '../db';
import { authenticate, AuthRequest, SUBSCRIPTION_LEVELS, SUBSCRIPTION_FEATURES, getUserFeatures, checkMachineLimit } from '../middleware/auth';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

// Register - New users start at level 0 (Free)
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('firstName').optional().trim().escape(),
    body('lastName').optional().trim().escape()
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password, firstName, lastName } = req.body;

      // Check if user exists
      const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
      if (existingUser.rows.length > 0) {
        return res.status(400).json({ error: 'Email already registered' });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create user with default free tier (level 0)
      const result = await query(
        `INSERT INTO users (email, password_hash, first_name, last_name, subscription_tier, subscription_level, machine_limit)
         VALUES ($1, $2, $3, $4, 'free', 0, 0)
         RETURNING id, email, first_name, last_name, role, subscription_tier, subscription_level, machine_limit, created_at`,
        [email, passwordHash, firstName || null, lastName || null]
      );

      const user = result.rows[0];
      const features = getUserFeatures(user.subscription_level);

      // Generate token
      const token = jwt.sign(
        { userId: user.id },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      res.status(201).json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          subscriptionTier: user.subscription_tier,
          subscriptionLevel: user.subscription_level,
          machineLimit: user.machine_limit,
          features
        },
        token
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  }
);

// Login
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;

      // Find user
      const result = await query(
        `SELECT id, email, password_hash, first_name, last_name, role, 
                subscription_tier, COALESCE(subscription_level, 0) as subscription_level,
                COALESCE(machine_limit, 0) as machine_limit, subscription_expires_at
         FROM users WHERE email = $1`,
        [email]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const user = result.rows[0];

      // Verify password
      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const features = getUserFeatures(user.subscription_level);

      // Generate token
      const token = jwt.sign(
        { userId: user.id },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      res.json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          subscriptionTier: user.subscription_tier,
          subscriptionLevel: user.subscription_level,
          machineLimit: user.machine_limit,
          subscriptionExpiresAt: user.subscription_expires_at,
          features
        },
        token
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  }
);

// Get current user with subscription details
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT id, email, first_name, last_name, role, subscription_tier, 
              COALESCE(subscription_level, 0) as subscription_level,
              COALESCE(machine_limit, 0) as machine_limit,
              subscription_expires_at, created_at
       FROM users WHERE id = $1`,
      [req.user!.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    const features = getUserFeatures(user.subscription_level);
    
    // Get current machine count
    const machineUsage = await checkMachineLimit(user.id, user.subscription_level);

    res.json({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      subscriptionTier: user.subscription_tier,
      subscriptionLevel: user.subscription_level,
      machineLimit: features.machineLimit,
      machinesUsed: machineUsage.current,
      subscriptionExpiresAt: user.subscription_expires_at,
      createdAt: user.created_at,
      features
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Get subscription info
router.get('/subscription', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT subscription_tier, COALESCE(subscription_level, 0) as subscription_level,
              subscription_expires_at
       FROM users WHERE id = $1`,
      [req.user!.id]
    );

    const user = result.rows[0];
    const features = getUserFeatures(user.subscription_level);
    const machineUsage = await checkMachineLimit(req.user!.id, user.subscription_level);

    res.json({
      currentPlan: {
        tier: user.subscription_tier,
        level: user.subscription_level,
        name: features.name,
        expiresAt: user.subscription_expires_at
      },
      features,
      usage: {
        machines: {
          current: machineUsage.current,
          limit: machineUsage.limit,
          unlimited: machineUsage.limit === -1
        }
      },
      availablePlans: [
        {
          level: SUBSCRIPTION_LEVELS.FREE,
          name: 'Free',
          price: 0,
          features: SUBSCRIPTION_FEATURES[SUBSCRIPTION_LEVELS.FREE]
        },
        {
          level: SUBSCRIPTION_LEVELS.BASIC,
          name: 'Basic',
          price: 9.99,
          features: SUBSCRIPTION_FEATURES[SUBSCRIPTION_LEVELS.BASIC]
        },
        {
          level: SUBSCRIPTION_LEVELS.PREMIUM,
          name: 'Premium',
          price: 29.99,
          features: SUBSCRIPTION_FEATURES[SUBSCRIPTION_LEVELS.PREMIUM]
        }
      ]
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({ error: 'Failed to get subscription info' });
  }
});

// Update subscription (for testing/admin - in production, use payment webhooks)
router.put('/subscription', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { level } = req.body;

    if (level === undefined || ![0, 1, 2].includes(level)) {
      return res.status(400).json({ error: 'Invalid subscription level' });
    }

    const tierName = level === 0 ? 'free' : level === 1 ? 'basic' : 'premium';
    const machineLimit = level === 0 ? 0 : level === 1 ? 10 : -1;
    const expiresAt = level > 0 ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null; // 30 days

    await query(
      `UPDATE users 
       SET subscription_tier = $1, 
           subscription_level = $2,
           machine_limit = $3,
           subscription_expires_at = $4
       WHERE id = $5`,
      [tierName, level, machineLimit, expiresAt, req.user!.id]
    );

    const features = getUserFeatures(level);

    res.json({
      message: 'Subscription updated successfully',
      subscription: {
        tier: tierName,
        level,
        machineLimit,
        expiresAt,
        features
      }
    });
  } catch (error) {
    console.error('Update subscription error:', error);
    res.status(500).json({ error: 'Failed to update subscription' });
  }
});

// Update profile
router.put(
  '/profile',
  authenticate,
  [
    body('firstName').optional().trim().escape(),
    body('lastName').optional().trim().escape()
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const { firstName, lastName } = req.body;

      const result = await query(
        `UPDATE users 
         SET first_name = COALESCE($1, first_name),
             last_name = COALESCE($2, last_name)
         WHERE id = $3
         RETURNING id, email, first_name, last_name, role, subscription_tier,
                   COALESCE(subscription_level, 0) as subscription_level`,
        [firstName, lastName, req.user!.id]
      );

      const user = result.rows[0];
      const features = getUserFeatures(user.subscription_level);

      res.json({
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        subscriptionTier: user.subscription_tier,
        subscriptionLevel: user.subscription_level,
        features
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  }
);

// Change password
router.put(
  '/password',
  authenticate,
  [
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 6 })
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { currentPassword, newPassword } = req.body;

      // Get current password hash
      const result = await query(
        'SELECT password_hash FROM users WHERE id = $1',
        [req.user!.id]
      );

      const validPassword = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
      if (!validPassword) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      // Update password
      const newHash = await bcrypt.hash(newPassword, 10);
      await query(
        'UPDATE users SET password_hash = $1 WHERE id = $2',
        [newHash, req.user!.id]
      );

      res.json({ message: 'Password updated successfully' });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ error: 'Failed to change password' });
    }
  }
);

export default router;
