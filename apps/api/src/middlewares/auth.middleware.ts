import { Request, Response, NextFunction } from 'express';
import { verifyJwtToken } from '../utils/crypto';
import { db } from '../db/client';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    let token = req.cookies?.socialhub_token;

    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      res.status(401).json({ error: 'Authentication required. Please log in.' });
      return;
    }

    const payload = verifyJwtToken<{ userId: string }>(token);
    if (!payload?.userId) {
      res.status(401).json({ error: 'Session expired or invalid token.' });
      return;
    }

    const user = await db.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      res.status(401).json({ error: 'User account not found.' });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    next();
  } catch (err) {
    res.status(401).json({ error: 'Authentication failed.' });
  }
}
