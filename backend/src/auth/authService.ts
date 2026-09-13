import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../database/pool';
import { env } from '../config/env';

export interface AdminUser {
  id: string;
  email: string;
  role: string;
}

export async function verifyCredentials(email: string, password: string): Promise<AdminUser | null> {
  const { rows } = await pool.query(
    'SELECT id, email, password_hash, role FROM users WHERE email = $1',
    [email]
  );
  const user = rows[0];
  if (!user) return null;

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return null;

  return { id: user.id, email: user.email, role: user.role };
}

export function issueSessionToken(user: AdminUser): string {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, env.jwtSecret, {
    expiresIn: '7d',
  });
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}
