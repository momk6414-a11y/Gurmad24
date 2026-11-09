'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

test('map distinguishes public directory references from verified GURMAD 24 facilities', async () => {
  const { placeTrust } = await import('../public/js/place-trust.mjs');
  const directory = placeTrust({ reference: true });
  assert.equal(directory.label, 'Directory reference — not verified');
  assert.equal(directory.badge, 'warn');
  assert.match(directory.notice, /has not verified/i);
  assert.equal(directory.ariaLabel, 'Directory reference, not verified: {name}');

  const registered = placeTrust({ reference: false });
  assert.equal(registered.label, 'Verified GURMAD 24 register');
  assert.equal(registered.badge, 'ok');
  assert.match(registered.notice, /verified facility register/i);
  assert.equal(registered.ariaLabel, 'Verified GURMAD 24 facility: {name}');
  assert.notEqual(directory.badge, registered.badge);
});
