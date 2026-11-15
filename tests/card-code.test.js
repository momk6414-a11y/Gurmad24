'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { newCardCode } = require('../src/domain');

test('card codes keep their format and use only the unambiguous alphabet', () => {
  const seen = new Set();
  for (let i = 0; i < 500; i++) {
    const c = newCardCode();
    assert.match(c, /^G24-[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$/);
    seen.add(c);
  }
  assert.equal(seen.size, 500, 'codes must be unique');
});
