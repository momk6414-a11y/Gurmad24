'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { load } = require('../src/config');
const H = require('./helper');

function configFor(overrides) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'g24-config-security-'));
  try {
    return load({
      DATA_DIR: dir,
      SESSION_SECRET: 'isolated-config-test-secret',
      NODE_ENV: 'test',
      RENDER: undefined,
      COOKIE_SECURE: undefined,
      ...overrides,
    });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test('session cookies default to Secure on production and Render, but not local development', () => {
  assert.equal(configFor({ NODE_ENV: 'production' }).cookieSecure, true);
  assert.equal(configFor({ RENDER: 'true', NODE_ENV: 'development' }).cookieSecure, true);
  assert.equal(configFor({ NODE_ENV: 'development' }).cookieSecure, false);
  assert.equal(configFor({ NODE_ENV: 'production', COOKIE_SECURE: 'false' }).cookieSecure, false);
  assert.equal(configFor({ NODE_ENV: 'development', COOKIE_SECURE: 'true' }).cookieSecure, true);
});

test('production login sends Secure session cookie and HSTS without extra configuration', async () => {
  const t = await H.start({
    NODE_ENV: 'production',
    RENDER: undefined,
    COOKIE_SECURE: undefined,
  });
  try {
    const response = await t.client().post('/api/auth/login', {
      email: 'admin@test.local',
      password: 'AdminPass123',
    });
    assert.equal(response.status, 200);
    assert.match(response.headers.get('set-cookie') || '', /(?:^|;\s*)Secure(?:;|$)/i);
    assert.match(response.headers.get('strict-transport-security') || '', /^max-age=15552000; includeSubDomains$/i);
  } finally {
    await t.stop();
  }
});
