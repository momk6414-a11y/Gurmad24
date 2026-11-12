'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { build } = require('../src/bootstrap');
const D = require('../src/domain');
const H = require('./helper');

test('bootstrap clears a previously persisted realMode flag before serving requests', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'g24-pilot-lock-'));
  const options = {
    DATA_DIR: dir,
    ADMIN_EMAIL: 'admin@pilot-lock.test',
    ADMIN_PASSWORD: 'AdminPass123',
    DEMO_PASSWORD: 'DemoPass12345',
    autoBackup: false,
    quiet: true,
  };
  let first;
  let second;
  try {
    first = build(options);
    D.settings(first.store).realMode = true;
    first.store.save();
    await first.app.shutdown();
    first = null;

    second = build(options);
    assert.equal(D.settings(second.store).realMode, false);
  } finally {
    if (second) await second.app.shutdown();
    if (first) await first.app.shutdown();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('pilot organisation registration rejects unsupported police and fire types', async () => {
  const t = await H.start();
  try {
    for (const [orgType, email] of [['police', 'police@pilot.test'], ['fire', 'fire@pilot.test']]) {
      const r = await t.client().post('/api/auth/register-org', {
        orgType, orgName: 'Pilot Unsupported Organisation', name: 'Pilot Manager',
        email, password: 'StrongPilotPass123', consent: true,
      });
      assert.equal(r.status, 400);
    }
  } finally {
    await t.stop();
  }
});

test('admin security screen explains the pilot lock and has no live-mode enable action', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'public/js/views/admin.js'), 'utf8');
  assert.match(source, /OFF — institutional pilot only/);
  assert.match(source, /Live dispatch cannot be enabled here/);
  assert.doesNotMatch(source, /Turn real mode ON/);
});
