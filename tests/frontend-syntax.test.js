'use strict';
// Guards against the "blank screen" class of bug: every browser module must at least parse.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs'); const path = require('path'); const os = require('os');
const { spawnSync } = require('child_process');

const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
test('all public JavaScript files parse as ES modules', () => {
  const files = walk(path.join(__dirname, '..', 'public')).filter(f => f.endsWith('.js'));
  assert.ok(files.length >= 10);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'g24-syn-'));
  for (const f of files) {
    const copy = path.join(tmp, 'm.mjs'); fs.copyFileSync(f, copy);
    const r = spawnSync(process.execPath, ['--check', copy], { encoding: 'utf8' });
    assert.equal(r.status, 0, path.relative(path.join(__dirname, '..'), f) + ' has a syntax error:\n' + r.stderr.split('\n').slice(0, 5).join('\n'));
  }
  fs.rmSync(tmp, { recursive: true, force: true });
});
