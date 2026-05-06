import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import type { Role } from '@wasal-t/types';

export type { Role };

export interface JwtPayload {
  userId: string;
  role: Role;
}

export function signJwt(
  payload: JwtPayload,
  secret: string,
  options: SignOptions = { expiresIn: '7d' },
): string {
  return jwt.sign(payload, secret, options);
}

export function verifyJwt(token: string, secret: string): JwtPayload {
  const decoded = jwt.verify(token, secret);
  if (typeof decoded === 'string') {
    throw new Error('Unexpected string JWT payload');
  }
  return decoded as JwtPayload;
}
