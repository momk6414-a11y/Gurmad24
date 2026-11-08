'use strict';
const crypto = require('crypto');

// ---- Passwords: scrypt with per-user random salt
function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(pw, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}
function verifyPassword(pw, stored) {
  try {
    const [alg, saltHex, hashHex] = String(stored).split('$');
    if (alg !== 'scrypt') return false;
    const hash = crypto.scryptSync(pw, Buffer.from(saltHex, 'hex'), 64, { N: 16384, r: 8, p: 1 });
    const expected = Buffer.from(hashHex, 'hex');
    return expected.length === hash.length && crypto.timingSafeEqual(hash, expected);
  } catch (_) { return false; }
}
const COMMON = new Set(['password', 'password1', 'password123', '12345678', '123456789', 'qwerty123', 'iloveyou1', 'welcome1', 'admin123', 'letmein1', 'gurmad24', 'gurmad123', 'somalia123', 'puntland1']);
function passwordProblem(pw, email) {
  if (typeof pw !== 'string' || pw.length < 8) return 'password_too_short';
  if (COMMON.has(pw.toLowerCase()) || /^(.)\1+$/.test(pw)) return 'password_common';
  if (email && String(email).split('@')[0].length >= 4 && pw.toLowerCase().includes(String(email).split('@')[0].toLowerCase())) return 'password_contains_email';
  if (pw.length > 128) return 'password_too_long';
  if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) return 'password_weak';
  return null;
}
function randomPassword() {
  const alphabet = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 14; i++) s += alphabet[crypto.randomInt(alphabet.length)];
  return s.slice(0, 6) + '-' + s.slice(6, 12) + '7' + s.slice(12);
}

// ---- Sessions: opaque random id in httpOnly cookie; only a SHA-256 hash is stored server-side
// A valid, process-random dummy hash keeps unknown-account logins on the same scrypt path.
// Its random plaintext is never used for authentication and is discarded immediately.
const DUMMY_PASSWORD_HASH = hashPassword(crypto.randomBytes(32).toString('hex'));

const sha = s => crypto.createHash('sha256').update(s).digest('hex');
function newSessionId() { return crypto.randomBytes(32).toString('base64url'); }

// ---- Simple in-memory rate limiter (per key, sliding window)
class RateLimiter {
  constructor() { this.hits = new Map(); }
  check(key, limit, windowMs = 60000) {
    const now = Date.now();
    const arr = (this.hits.get(key) || []).filter(t => now - t < windowMs);
    arr.push(now); this.hits.set(key, arr);
    if (this.hits.size > 5000) for (const [k, v] of this.hits) if (!v.length || now - v[v.length - 1] > windowMs) this.hits.delete(k);
    return arr.length <= limit;
  }
  reset() { this.hits.clear(); }
}

// ---- TOTP (RFC 6238, SHA-1, 6 digits, 30 s) for optional two-step login
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function b32encode(buf) { let bits = '', out = ''; for (const b of buf) bits += b.toString(2).padStart(8, '0'); for (let i = 0; i < bits.length; i += 5) out += B32[parseInt(bits.slice(i, i + 5).padEnd(5, '0'), 2)]; return out; }
function b32decode(str) { let bits = ''; for (const c of String(str).replace(/=+$/, '').toUpperCase()) { const i = B32.indexOf(c); if (i < 0) return Buffer.alloc(0); bits += i.toString(2).padStart(5, '0'); } const out = []; for (let i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8), 2)); return Buffer.from(out); }
const newTotpSecret = () => b32encode(crypto.randomBytes(20));
function totpAt(secret, step) {
  const msg = Buffer.alloc(8); msg.writeBigUInt64BE(BigInt(step));
  const h = crypto.createHmac('sha1', b32decode(secret)).update(msg).digest(); const o = h[h.length - 1] & 15;
  return String(((h[o] & 127) << 24 | h[o + 1] << 16 | h[o + 2] << 8 | h[o + 3]) % 1e6).padStart(6, '0');
}
// returns the matched time-step (for replay protection) or null
function totpCheck(secret, code, lastStep = 0, now = Date.now()) {
  const c = String(code || '').replace(/\s/g, ''); if (!/^\d{6}$/.test(c)) return null;
  const cur = Math.floor(now / 30000);
  for (const d of [0, -1, 1]) { const st = cur + d; if (st > lastStep && crypto.timingSafeEqual(Buffer.from(totpAt(secret, st)), Buffer.from(c))) return st; }
  return null;
}

module.exports = { newTotpSecret, totpAt, totpCheck, hashPassword, verifyPassword, passwordProblem, randomPassword, DUMMY_PASSWORD_HASH, sha, newSessionId, RateLimiter };
