import * as jwt from 'jsonwebtoken';
import { AdminJwtPayload } from '../types';

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

export function signAccessToken(payload: AdminJwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN as any });
}

export function signRefreshToken(payload: AdminJwtPayload): string {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN as any });
}

export function verifyAccessToken(token: string): AdminJwtPayload {
  return jwt.verify(token, JWT_SECRET) as AdminJwtPayload;
}

export function verifyRefreshToken(token: string): AdminJwtPayload {
  return jwt.verify(token, JWT_REFRESH_SECRET) as AdminJwtPayload;
}

/**
 * Token issued after a correct password but BEFORE the second factor. It is
 * deliberately marked `typ: '2fa_challenge'` and carries no role, so
 * `verifyAccessToken` consumers can never mistake it for a session: the
 * `authenticate` middleware rejects any token carrying this marker.
 */
export function signChallengeToken(uid: string): string {
  return jwt.sign({ uid, typ: '2fa_challenge' }, JWT_SECRET, { expiresIn: '5m' });
}

export function verifyChallengeToken(token: string): { uid: string } {
  const decoded = jwt.verify(token, JWT_SECRET) as any;
  if (decoded?.typ !== '2fa_challenge') {
    throw new Error('Not a two-factor challenge token');
  }
  return { uid: decoded.uid };
}
