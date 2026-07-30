import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_dairy_key';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
    name: string;
  };
}

export const authenticateJWT = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(403).json({ error: 'Forbidden: Invalid token' });
      }
      req.user = decoded as AuthRequest['user'];
      next();
    });
  } else {
    res.status(401).json({ error: 'Unauthorized: No token provided' });
  }
};

export const requireRole = (roles: Array<'ADMIN' | 'MANAGER' | 'EMPLOYEE'>) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }

    next();
  };
};
