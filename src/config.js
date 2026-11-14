'use strict';
// Configuration from environment variables (+ optional .env file). No secrets in code.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function loadDotEnv(file) {
  try {
    const txt = fs.readFileSync(file, 'utf8');
    for (const line of txt.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
      if (!m || line.trim().startsWith('#')) continue;
      let v = m[2];
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (process.env[m[1]] === undefined) process.env[m[1]] = v;
    }
  } catch (_) { /* no .env file: fine */ }
}

function bool(v, d) { if (v === undefined || v === '') return d; return /^(1|true|yes|on)$/i.test(String(v)); }

function load(overrides = {}) {
  loadDotEnv(path.join(__dirname, '..', '.env'));
  const env = { ...process.env, ...overrides };
  const dataDir = path.resolve(env.DATA_DIR || path.join(__dirname, '..', 'data'));
  fs.mkdirSync(dataDir, { recursive: true });
  // Production and Render terminate public traffic over HTTPS; protect session cookies by default.
  // COOKIE_SECURE remains an explicit override for controlled local/proxy test environments.
  const secureCookiesByDefault = bool(env.RENDER, false) || String(env.NODE_ENV || '').toLowerCase() === 'production';
  let secret = env.SESSION_SECRET;
  if (!secret) {
    const f = path.join(dataDir, '.secret');
    try { secret = fs.readFileSync(f, 'utf8').trim(); } catch (_) { /* create below */ }
    if (!secret) { secret = crypto.randomBytes(32).toString('hex'); fs.writeFileSync(f, secret, { mode: 0o600 }); }
  }
  return {
    port: Number(env.PORT || 8080),
    dataDir,
    secret,
    adminEmail: (env.ADMIN_EMAIL || 'admin@example.com').toLowerCase(),
    adminPassword: env.ADMIN_PASSWORD || '',
    demoMode: bool(env.DEMO_MODE, true),
    seedDemoData: bool(env.SEED_DEMO_DATA, true),
    demoPassword: env.DEMO_PASSWORD || '',
    anthropicKey: env.ANTHROPIC_API_KEY || '', anthropicModel: env.ANTHROPIC_MODEL || '',
    cookieSecure: bool(env.COOKIE_SECURE, secureCookiesByDefault),
    trustProxy: bool(env.TRUST_PROXY, false),
    retentionDays: Number(env.RETENTION_DAYS || 365),
    persistentStorage: bool(env.PERSISTENT_STORAGE, !env.RENDER),
    supabaseUrl: String(env.SUPABASE_URL || '').replace(/\/$/, ''),
    supabaseServiceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY || '',
    publicDir: path.join(__dirname, '..', 'public'),
    rateLimit: overrides.rateLimit || { authPerMin: 20, globalPerMin: 600 },
    autoBackup: overrides.autoBackup !== undefined ? overrides.autoBackup : true,
  };
}

module.exports = { load };
