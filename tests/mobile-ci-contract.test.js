'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const workflowPath = path.join(__dirname, '..', '.github', 'workflows', 'tests.yml');
const workflow = fs.readFileSync(workflowPath, 'utf8');

test('CI keeps the repository token read-only', () => {
  assert.match(workflow, /permissions:\s*\n\s+contents:\s*read\b/);
  assert.doesNotMatch(workflow, /permissions:\s*\n\s+contents:\s*write\b/);
});

test('CI typechecks the Expo native app on pull requests and main pushes', () => {
  assert.match(workflow, /mobile-typecheck:/);
  assert.match(workflow, /working-directory:\s*mobile-native\b/);
  assert.match(workflow, /node-version:\s*22\b/);
  assert.match(workflow, /npm run typecheck/);
  assert.match(workflow, /pull_request:\s*\n\s+branches:\s*\[main\]/);
});
