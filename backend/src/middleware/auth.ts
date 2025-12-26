import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../db';

// Subscription levels and their features
export const SUBSCRIPTION_LEVELS = {
  FREE: 0,      // Level 0: Record only, no saving, no AI, no database
  BASIC: 1,     // Level 1: Database, factories, up to 10 machines, AI included
  PREMIUM: 2,   // Level 2: Unlimited everything
} as const;

export const SUBSCRIPTION_FEATURES = {
  [SUBSCRIPTION_LEVELS.FREE]: {
    name: 'Free',
    canSaveSamples: false,
    canUseAI: false,
    canCreateCompanies: false,
    canCreateFactories: false,
    canCreateMachines: false,
    canGenerateReports: false,
    canViewHistory: false,
    machineLimit: 0,
    samplesPerDay: 0,
  },
  [SUBSCRIPTION_LEVELS.BASIC]: {
    name: 'Basic',
    canSaveSamples: true,
    canUseAI: true,
    canCreateCompanies: true,
    canCreateFactories: true,
    canCreateMachines: true,
    canGenerateReports: true,
    canViewHistory: true,
    machineLimit: 10,
    samplesPerDay: 50,
  },
  [SUBSCRIPTION_LEVELS.PREMIUM]: {
    name: 'Premium',
    canSaveSamples: true,
    canUseAI: true,
    canCreateCompanies: true,
    canCreateFactories: true,
    canCreateMachines: true,
    canGenerateReports: true,
    canViewHistory: true,
    machineLimit: -1, // Unlimited
    samplesPerDay: -1, // Unlimited
  },
};

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    subscription_tier: string;
    subscription_level: number;
    machine_limit: number;
  };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'default-secret';
    
    const decoded = jwt.verify(token, secret) as any;
    
    // Verify user still exists and get subscription info
    const result = await query(
      `SELECT id, email, role, subscription_tier, 
              COALESCE(subscription_level, 0) as subscription_level,
              COALESCE(machine_limit, 0) as machine_limit
       FROM users WHERE id = $1`,
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: 'Token expired' });
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    return res.status(500).json({ error: 'Authentication failed' });
  }
};

export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'default-secret';
    
    const decoded = jwt.verify(token, secret) as any;
    
    const result = await query(
      `SELECT id, email, role, subscription_tier,
              COALESCE(subscription_level, 0) as subscription_level,
              COALESCE(machine_limit, 0) as machine_limit
       FROM users WHERE id = $1`,
      [decoded.userId]
    );

    if (result.rows.length > 0) {
      req.user = result.rows[0];
    }
    
    next();
  } catch {
    // Token invalid, continue without auth
    next();
  }
};

export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

// Middleware to check subscription level
export const requireSubscription = (minLevel: number) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userLevel = req.user.subscription_level || 0;
    
    if (userLevel < minLevel) {
      const requiredTier = minLevel === SUBSCRIPTION_LEVELS.PREMIUM ? 'Premium' : 'Basic';
      return res.status(403).json({ 
        error: 'Subscription upgrade required',
        message: `This feature requires a ${requiredTier} subscription`,
        requiredLevel: minLevel,
        currentLevel: userLevel
      });
    }

    next();
  };
};

// Middleware to check specific features
export const requireFeature = (feature: keyof typeof SUBSCRIPTION_FEATURES[0]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userLevel = req.user.subscription_level || 0;
    const features = SUBSCRIPTION_FEATURES[userLevel as keyof typeof SUBSCRIPTION_FEATURES] 
      || SUBSCRIPTION_FEATURES[SUBSCRIPTION_LEVELS.FREE];
    
    if (!features[feature]) {
      return res.status(403).json({ 
        error: 'Feature not available',
        message: `This feature is not available on your current plan. Please upgrade to access ${feature}.`,
        feature,
        currentLevel: userLevel
      });
    }

    next();
  };
};

// Helper to get user's subscription features
export const getUserFeatures = (subscriptionLevel: number) => {
  return SUBSCRIPTION_FEATURES[subscriptionLevel as keyof typeof SUBSCRIPTION_FEATURES] 
    || SUBSCRIPTION_FEATURES[SUBSCRIPTION_LEVELS.FREE];
};

// Helper to check machine limit
export const checkMachineLimit = async (userId: string, subscriptionLevel: number): Promise<{ allowed: boolean; current: number; limit: number }> => {
  const features = getUserFeatures(subscriptionLevel);
  
  if (features.machineLimit === -1) {
    return { allowed: true, current: 0, limit: -1 };
  }

  const result = await query(
    `SELECT COUNT(*) as count FROM machines m
     JOIN factories f ON m.factory_id = f.id
     JOIN companies c ON f.company_id = c.id
     WHERE c.owner_id = $1`,
    [userId]
  );

  const currentCount = parseInt(result.rows[0].count);
  
  return {
    allowed: currentCount < features.machineLimit,
    current: currentCount,
    limit: features.machineLimit
  };
};
