'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Store } = require('../src/store');
const { build } = require('../src/bootstrap');

test('startup clears a legacy live-dispatch flag without deleting hospital or case records', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'g24-dispatch-lock-'));
  const now = new Date().toISOString();
  try {
    const seeded = new Store(dir).load();
    const hospital = { id: 'org-preserved-fixture', type: 'hospital', name: 'Preserved Fixture Hospital', status: 'verified', phone: '+252000000000', createdAt: now };
    const legacyCase = { id: 'case-preserved-fixture', code: 'SIM-900099', mode: 'REAL', category: 'general', responder: 'ambulance', status: 'received', source: 'test', createdBy: null, createdAt: now, updatedAt: now, autopilot: false, trackToken: null, history: [] };
    seeded.data.settings.realMode = true;
    seeded.data.orgs.push(hospital);
    seeded.data.cases.push(legacyCase);
    seeded.flush();

    const built = build({
      DATA_DIR: dir,
      ADMIN_EMAIL: 'dispatch-lock-admin@test.local',
      ADMIN_PASSWORD: 'AdminPass123',
      DEMO_PASSWORD: 'DemoPass12345',
      SEED_DEMO_DATA: 'false',
      DISABLE_DEMO_ACCOUNTS: 'true',
      autoBackup: false,
      quiet: true,
    });

    assert.equal(built.store.data.settings.realMode, false);
    const preservedHospital = built.store.get('orgs', hospital.id);
    assert.equal(preservedHospital.name, hospital.name);
    assert.equal(preservedHospital.phone, hospital.phone);
    assert.equal(preservedHospital.status, hospital.status);
    const preservedCase = built.store.get('cases', legacyCase.id);
    assert.equal(preservedCase.code, legacyCase.code);
    assert.equal(preservedCase.mode, legacyCase.mode);
    assert.equal(preservedCase.status, legacyCase.status);
    built.store.flush();
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
