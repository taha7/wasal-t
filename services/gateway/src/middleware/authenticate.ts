import { verifyJwt } from '@wasal-t/auth';
import type { NextFunction, Request, Response } from 'express';

const JWT_SECRET = process.env['JWT_SECRET'] ?? 'dev-secret';

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }
  try {
    req.user = verifyJwt(header.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
