import { Request, Response, NextFunction } from 'express';
import { verify } from '../lib/jwt';

export interface AuthRequest extends Request {
  user?: any;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Authorization required' });
  const token = auth.slice(7);
  try {
    const payload = verify(token);
    // Normalize token payload to include `id` for convenience (sub -> id)
    req.user = { ...(payload as any), id: (payload as any).sub };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const user = req.user as any;
    if (!user) return res.status(401).json({ error: 'Authorization required' });
    if (!roles.includes(user.role)) return res.status(403).json({ error: 'Insufficient permissions' });
    next();
  };
}
