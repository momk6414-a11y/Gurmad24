'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { resolveStorageMode } = require('../server');

test('Render refuses to use temporary JSON storage when Supabase settings are absent', () => {
  assert.throws(
    () => resolveStorageMode({ RENDER: 'true' }),
    /Render requires both SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY; refusing temporary JSON storage\./
  );
});

test('Render refuses partial or blank Supabase configuration', () => {
  const cases = [
    { RENDER: 'true', SUPABASE_URL: 'https://example.supabase.co' },
    { RENDER: 'true', SUPABASE_SERVICE_ROLE_KEY: 'synthetic-test-key-not-a-secret' },
    { RENDER: 'true', SUPABASE_URL: '   ', SUPABASE_SERVICE_ROLE_KEY: 'synthetic-test-key-not-a-secret' },
  ];
  for (const env of cases) {
    assert.throws(
      () => resolveStorageMode(env),
      /Render requires both SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY; refusing temporary JSON storage\./
    );
  }
});

test('Render selects Supabase only when both settings are present', () => {
  assert.equal(resolveStorageMode({
    RENDER: 'true',
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'synthetic-test-key-not-a-secret',
  }), 'supabase');
});

test('local development retains the JSON store when Supabase is not configured', () => {
  assert.equal(resolveStorageMode({ NODE_ENV: 'development' }), 'json');
});

test('partial local Supabase configuration continues through the Supabase path for its existing validation', () => {
  assert.equal(resolveStorageMode({
    NODE_ENV: 'development',
    SUPABASE_URL: 'https://example.supabase.co',
  }), 'supabase');
});
