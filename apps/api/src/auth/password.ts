// Password hashing with Node's built-in scrypt (no native dependencies).
// Stored format: scrypt$N$r$p$<salt base64>$<hash base64>
import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';

const PARAMS = { N: 16384, r: 8, p: 1 };
const KEY_LENGTH = 64;

function derive(password: string, salt: Buffer, opts: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password.normalize('NFKC'), salt, KEY_LENGTH, { ...opts, maxmem: 64 * 1024 * 1024 }, (err, key) =>
      err ? reject(err) : resolve(key),
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(password, salt, PARAMS);
  return ['scrypt', PARAMS.N, PARAMS.r, PARAMS.p, salt.toString('base64'), key.toString('base64')].join('$');
}

// A real hash of a random password, used when the email does not exist so a
// failed login takes the same time either way.
const DUMMY_HASH = hashPassword(randomBytes(16).toString('hex'));

async function matches(password: string, stored: string): Promise<boolean> {
  const [scheme, N, r, p, saltB64, keyB64] = stored.split('$');
  if (scheme !== 'scrypt' || !keyB64) return false;
  const expected = Buffer.from(keyB64, 'base64');
  const actual = await derive(password, Buffer.from(saltB64, 'base64'), { N: +N, r: +r, p: +p });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

// `stored` is null when the email is unknown; placeholder hashes (e.g. '!')
// never match. Both still run one scrypt so timing does not reveal accounts.
export async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  const usable = stored?.startsWith('scrypt$') ? stored : null;
  const ok = await matches(password, usable ?? (await DUMMY_HASH));
  return ok && usable !== null;
}
