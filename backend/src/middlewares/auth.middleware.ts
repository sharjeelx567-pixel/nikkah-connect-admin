import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { AdminRole, AdminJwtPayload } from '../types';

// Extend Express Request to include admin
declare global {
  namespace Express {
    interface Request {
      admin?: AdminJwtPayload;
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, error: 'Authorization token required' });
      return;
    }

    const token = authHeader.split(' ')[1];
    // Verify custom JWT - no Firebase project dependency
    const decoded = verifyAccessToken(token);
    req.admin = { uid: decoded.uid, email: decoded.email, role: decoded.role };
    next();
  } catch (error) {
    res.status(401).json({ success: false, error: 'Invalid or expired authorization token' });
  }
}

export function authorize(allowedRoles: AdminRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.admin) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }
    if (!allowedRoles.includes(req.admin.role)) {
      res.status(403).json({
        success: false,
        error: 'Access denied. Requires one of the following roles: ' + allowedRoles.join(', '),
      });
      return;
    }
    next();
  };
}
