'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const H = require('./helper');

let t, admin, hospitalId, providerId;
before(async () => {
  t = await H.start();
  admin = await H.admin(t);
  const register = async (orgType, suffix) => {
    const client = t.client();
    const r = await client.post('/api/auth/register-org', {
      orgType, orgName: suffix + ' organisation', area: 'Bosaso',
      name: suffix + ' Admin', email: suffix.toLowerCase() + '@admin-filter.test',
      password: 'EyePass12345', consent: true,
    });
    assert.equal(r.status, 201);
    await admin.patch('/api/admin/orgs/' + r.data.org.id, { status: 'verified' });
    return r.data.org.id;
  };
  hospitalId = await register('hospital', 'Filter Hospital');
  providerId = await register('ambulance', 'Filter Ambulance');
});
after(async () => { await t.stop(); });

test('admin organisation list filters verified hospitals separately from other providers', async () => {
  const hospitals = await admin.get('/api/admin/orgs?status=verified&type=hospital');
  assert.equal(hospitals.status, 200);
  assert.ok(hospitals.data.orgs.some(o => o.id === hospitalId));
  assert.ok(!hospitals.data.orgs.some(o => o.id === providerId));

  const providers = await admin.get('/api/admin/orgs?status=verified&type=provider');
  assert.equal(providers.status, 200);
  assert.ok(providers.data.orgs.some(o => o.id === providerId));
  assert.ok(!providers.data.orgs.some(o => o.id === hospitalId));
});

test('unknown organisation type filter returns no organisations', async () => {
  const result = await admin.get('/api/admin/orgs?type=unknown');
  assert.equal(result.status, 200);
  assert.deepEqual(result.data.orgs, []);
});
