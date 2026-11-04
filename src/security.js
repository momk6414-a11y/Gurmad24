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
function passwordProblem(pw) {
  if (typeof pw !== 'string' || pw.length < 8) return 'password_too_short';
  if (pw.length > 128) return 'password_too_long';
  if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) return 'password_weak';
  return null;
}
function randomPassword() {
  const alphabet = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = ''; const b = crypto.randomBytes(14);
  for (const x of b) s += alphabet[x % alphabet.length];
  return s.slice(0, 6) + '-' + s.slice(6, 12) + '7' + s.slice(12);
}

// ---- Sessions: opaque random id in httpOnly cookie; only a SHA-256 hash is stored server-side
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

module.exports = { hashPassword, verifyPassword, passwordProblem, randomPassword, sha, newSessionId, RateLimiter };
