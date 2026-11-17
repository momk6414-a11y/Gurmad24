'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const workflowPath = path.join(__dirname, '..', '.github', 'workflows', 'mobile-android-release.yml');
const workflow = fs.readFileSync(workflowPath, 'utf8');

test('Android release checks out the repository before using the mobile working directory', () => {
  const checkout = workflow.indexOf('- uses: actions/checkout@v4');
  const secretsCheck = workflow.indexOf('- name: Check signing secrets exist');

  assert.notEqual(checkout, -1, 'checkout step must exist');
  assert.notEqual(secretsCheck, -1, 'signing-secret validation step must exist');
  assert.ok(checkout < secretsCheck, 'checkout must run before the first step that inherits working-directory: mobile');
  assert.match(workflow, /working-directory:\s*mobile/, 'release steps must keep the mobile working directory');
});

test('Android release version input stays outside shell source and is strictly validated', () => {
  assert.match(workflow, /VERSION_NAME:\s*\$\{\{\s*inputs\.version_name\s*\}\}/);
  assert.doesNotMatch(workflow, /\$\{\{\s*inputs\.version_name\s*\}\}[^\n]*run:/);
  assert.match(workflow, /\[\[\s*!\s*"\$VERSION_NAME"\s*=~\s*\^\[0-9\]\+\\\.\[0-9\]\+\\\.\[0-9\]\+\$\s*\]\]/);
  assert.match(workflow, /permissions:\s*\n\s+contents:\s*read/);
});
