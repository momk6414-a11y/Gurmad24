'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { build } = require('../src/bootstrap');
const D = require('../src/domain');

test('startup downgrades active legacy REAL cases without auto-advancing or losing audit context', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'g24-legacy-case-lock-'));
  const options = {
    DATA_DIR: dir,
    ADMIN_EMAIL: 'admin@legacy-lock.test',
    ADMIN_PASSWORD: 'AdminPass123',
    DEMO_PASSWORD: 'DemoPass12345',
    autoBackup: false,
    quiet: true,
  };
  let first;
  let second;
  try {
    first = build(options);
    const createdAt = new Date().toISOString();
    first.store.insert('cases', {
      id: 'legacy-active-case',
      code: 'SIM-900001',
      mode: 'REAL',
      category: 'general',
      responder: 'ambulance',
      status: 'received',
      source: 'public',
      createdBy: null,
      createdAt,
      updatedAt: createdAt,
      autopilot: false,
      trackToken: 'legacy-active-track-token',
      history: [{ ts: createdAt, status: 'received', by: 'public', note: '' }],
    });
    first.store.insert('cases', {
      id: 'legacy-closed-case',
      code: 'SIM-900002',
      mode: 'REAL',
      category: 'general',
      responder: 'ambulance',
      status: 'closed',
      source: 'public',
      createdBy: null,
      createdAt,
      updatedAt: createdAt,
      autopilot: false,
      trackToken: null,
      history: [{ ts: createdAt, status: 'closed', by: 'operator', note: 'Historical record' }],
    });
    D.settings(first.store).realMode = true;
    first.store.save();
    await first.app.shutdown();
    first = null;

    second = build(options);
    assert.equal(D.settings(second.store).realMode, false);

    const active = second.store.get('cases', 'legacy-active-case');
    assert.equal(active.mode, 'SIMULATION');
    assert.equal(active.legacyMode, 'REAL');
    assert.equal(active.autopilot, false);
    assert.equal(active.trackToken, 'legacy-active-track-token');
    assert.ok(active.legacyModeDisabledAt);
    assert.match(active.history.at(-1).note, /no integrated dispatch is configured/i);

    const closed = second.store.get('cases', 'legacy-closed-case');
    assert.equal(closed.mode, 'REAL');
    assert.equal(closed.history.length, 1);
    assert.equal(closed.history[0].note, 'Historical record');
  } finally {
    if (second) await second.app.shutdown();
    if (first) await first.app.shutdown();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
