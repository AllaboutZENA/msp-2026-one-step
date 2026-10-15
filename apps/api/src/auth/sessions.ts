// Opaque bearer tokens: the client keeps the random token, the DB keeps only
// its SHA-256 hash, so a DB leak does not leak usable tokens.
import { createHash, randomBytes } from 'node:crypto';
import type { Queryable } from '../db.js';

export const SESSION_TTL_DAYS = 30;

export function hashToken(token: string): Buffer {
  return createHash('sha256').update(token).digest();
}

export async function createSession(db: Queryable, userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString('base64url');
  const { rows } = await db.query<{ expires_at: Date }>(
    `INSERT INTO sessions (user_id, token_hash, expires_at)
     VALUES ($1, $2, now() + make_interval(days => $3)) RETURNING expires_at`,
    [userId, hashToken(token), SESSION_TTL_DAYS],
  );
  return { token, expiresAt: rows[0].expires_at };
}

export async function findSessionUser(db: Queryable, token: string): Promise<string | null> {
  const { rows } = await db.query<{ user_id: string }>(
    'SELECT user_id FROM sessions WHERE token_hash = $1 AND expires_at > now()',
    [hashToken(token)],
  );
  return rows[0]?.user_id ?? null;
}

export async function deleteSession(db: Queryable, token: string): Promise<void> {
  await db.query('DELETE FROM sessions WHERE token_hash = $1', [hashToken(token)]);
}
