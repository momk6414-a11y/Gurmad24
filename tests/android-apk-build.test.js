'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const app = JSON.parse(fs.readFileSync(path.join(root, 'mobile-native/app.json'), 'utf8'));
const workflow = fs.readFileSync(path.join(root, '.github/workflows/build-gurmad24-apk.yml'), 'utf8');

test('Android side-by-side test APK keeps a separate package identity', () => {
  assert.equal(app.expo.name, 'GURMAD 24 TEST');
  assert.equal(app.expo.android.package, 'so.gurmad24.test');
  assert.equal(app.expo.scheme, 'gurmad24test');
  assert.notEqual(app.expo.android.package, app.expo.ios.bundleIdentifier);
});

test('Android APK workflow verifies package identity, signature and embedded bundle', () => {
  assert.match(workflow, /apksigner.*verify/);
  assert.match(workflow, /aapt.*dump badging/);
  assert.match(workflow, /so\.gurmad24\.test/);
  assert.match(workflow, /assets\/index\.android\.bundle/);
});
