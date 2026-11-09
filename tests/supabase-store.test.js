'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { SupabaseStore } = require('../src/supabase-store');

test('SupabaseStore loads collections and commits only changed rows', async () => {
  const store = new SupabaseStore('/tmp/gurmad24-test-data', { url: 'https://example.supabase.co', serviceRoleKey: 'test-only' });
  const calls = [];
  store._rpc = async (name, body) => {
    calls.push({ name, body });
    if (name === 'gurmad24_store_load') return { meta: { version: 3 }, settings: { currency: 'USD' }, collections: { users: [{ id: 'u_1', email: 'test@example.com' }] } };
    return { ok: true };
  };

  await store.connect();
  assert.equal(store.data.meta.version, 3);
  assert.equal(store.find('users', u => u.id === 'u_1').email, 'test@example.com');
  assert.deepEqual(store.col('sessions'), []);

  store.insert('users', { id: 'u_2', email: 'next@example.com' });
  await store.flush();
  assert.equal(calls.length, 2);
  assert.equal(calls[1].name, 'gurmad24_store_replace');
  assert.equal(calls[1].body.p_changes.collections.users.upsert.length, 1);
  assert.equal(calls[1].body.p_changes.collections.users.upsert[0].id, 'u_2');
  assert.equal(calls[1].body.p_changes.stateChanged, false);
  await store.close();
});

test('SupabaseStore refuses to connect without server-side credentials', async () => {
  const store = new SupabaseStore('/tmp/gurmad24-test-data');
  await assert.rejects(store.connect(), /SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY/);
});

test('SupabaseStore persists deletions and retries a failed commit', async () => {
  const store = new SupabaseStore('/tmp/gurmad24-test-data', { url: 'https://example.supabase.co', serviceRoleKey: 'test-only' });
  let writes = 0;
  store._rpc = async name => {
    if (name === 'gurmad24_store_load') return { meta: { version: 3 }, settings: {}, collections: { users: [{ id: 'u_old' }] } };
    writes++;
    if (writes === 1) throw new Error('temporary network failure');
    return { ok: true };
  };
  await store.connect();
  store.remove('users', 'u_old');
  await assert.rejects(store.flush(), /temporary network failure/);
  assert.equal(store.dirty, true);
  await store.flush();
  assert.equal(store.dirty, false);
  assert.equal(writes, 2);
});
