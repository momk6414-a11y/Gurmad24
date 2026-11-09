'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { start } = require('./helper');

test('serves browser .mjs modules with a JavaScript MIME type and revalidation', async () => {
  const t = await start();
  try {
    const response = await fetch(t.base + '/js/place-trust.mjs');
    assert.equal(response.status, 200);
    assert.ok((response.headers.get('content-type') || '').startsWith('text/javascript'));
    assert.equal(response.headers.get('cache-control'), 'no-cache');
    assert.match(await response.text(), /export function placeTrust/);
  } finally {
    await t.stop();
  }
});
