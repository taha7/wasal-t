import bcrypt from 'bcryptjs';
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

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
