-- 002_auth: email/password login with opaque session tokens (decided 2026-10-15, Issue #11).
-- Passwords are stored only as scrypt hashes; sessions store only a SHA-256 hash of the token.

ALTER TABLE users ADD COLUMN email text;
ALTER TABLE users ADD COLUMN password_hash text;

-- Rows created before auth existed (local synthetic seed data) get placeholder values
-- that can never match a login.
UPDATE users SET email = 'legacy-' || id || '@example.invalid' WHERE email IS NULL;
UPDATE users SET password_hash = '!' WHERE password_hash IS NULL;

ALTER TABLE users ALTER COLUMN email SET NOT NULL;
ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL;
ALTER TABLE users ADD CONSTRAINT users_email_format CHECK (position('@' in email) > 1 AND length(email) <= 254);
CREATE UNIQUE INDEX users_email_lower_idx ON users (lower(email));

CREATE TABLE sessions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash bytea NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE INDEX sessions_user_idx ON sessions (user_id);
CREATE INDEX sessions_expires_idx ON sessions (expires_at);
