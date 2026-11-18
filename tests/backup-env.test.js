'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const script = path.join(__dirname, '..', 'scripts', 'validate-backup-env.sh');
const KEY = 'k'.repeat(40);
const GOOD = 'postgresql://postgres.abcdefghij:S3cretpass@aws-0-eu-central-1.pooler.supabase.com:5432/postgres';
const run = (url, key = KEY) => spawnSync('bash', [script], { env: { PATH: process.env.PATH, SUPABASE_DB_URL: url, BACKUP_ENCRYPTION_KEY: key }, encoding: 'utf8' });

test('accepts a Supabase session pooler URI and a long key', () => {
  const r = run(GOOD);
  assert.equal(r.status, 0, r.stdout);
  assert.ok(!r.stdout.includes('S3cretpass'), 'must not print the password');
});

for (const [name, url, hint] of [
  ['empty secret', '', 'empty or missing'],
  ['API URL pasted instead of DB URI', 'https://abcdefghij.supabase.co', 'API URL'],
  ['not a postgres URI', 'mysql://u:p@h/db', 'must start with postgresql://'],
  ['placeholder password left in', 'postgresql://postgres.abcdefghij:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres', 'placeholder'],
  ['direct (IPv6-only) host', 'postgresql://postgres:S3cretpass@db.abcdefghij.supabase.co:5432/postgres', 'IPv6'],
  ['transaction pooler port', 'postgresql://postgres.abcdefghij:S3cretpass@aws-0-eu-central-1.pooler.supabase.com:6543/postgres', '6543'],
  ['pooler with bare username', 'postgresql://postgres:S3cretpass@aws-0-eu-central-1.pooler.supabase.com:5432/postgres', 'postgres.<project-ref>'],
  ['unencoded @ in password', 'postgresql://postgres.abcdefghij:pa@ss@aws-0-eu-central-1.pooler.supabase.com:5432/postgres', "unencoded '@'"],
  ['whitespace in value', 'postgresql://postgres.abcdefghij:S3 cret@aws-0-eu-central-1.pooler.supabase.com:5432/postgres', 'spaces']
]) {
  test(`rejects: ${name}`, () => {
    const r = run(url);
    assert.equal(r.status, 1);
    assert.ok(r.stdout.includes(hint), `expected "${hint}" in: ${r.stdout}`);
    assert.ok(!r.stdout.includes('S3cretpass'), 'must not print the password');
  });
}

test('rejects a short encryption key', () => {
  const r = run(GOOD, 'short');
  assert.equal(r.status, 1);
  assert.ok(r.stdout.includes('at least 32'));
});
