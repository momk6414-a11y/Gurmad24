'use strict';
// Payment abstraction layer.
// Only the SANDBOX provider is implemented: it moves no real money and never contacts a bank,
// mobile-money operator or card network. Real providers must be added as new entries here AFTER
// their availability, commercial terms and API access in Somalia are verified (see docs/PAYMENTS.md).
const crypto = require('crypto');

const sandbox = {
  id: 'sandbox',
  label: 'Sandbox (demo)',
  real: false,
  async charge({ amountCents, currency, reference }) {
    if (!Number.isInteger(amountCents) || amountCents < 0) throw new Error('bad_amount');
    return { status: 'succeeded', providerRef: 'SBX-' + crypto.randomBytes(5).toString('hex').toUpperCase(), sandbox: true, amountCents, currency, reference };
  },
  async refund({ amountCents, providerRef }) {
    return { status: 'refunded', providerRef: 'SBX-RF-' + crypto.randomBytes(5).toString('hex').toUpperCase(), original: providerRef, sandbox: true, amountCents };
  },
};

// Placeholders so admins can SEE what is planned. They are NOT connected and cannot be selected.
const planned = [
  { id: 'mobile_money', label: 'Mobile money (provider to be verified)', real: true, connected: false, requires: 'Merchant agreement, API credentials, legal review' },
  { id: 'bank_card', label: 'Bank / card gateway (to be verified)', real: true, connected: false, requires: 'Gateway availability in Somalia, merchant account, PCI-compliant hosted checkout' },
];

function getProvider(id = 'sandbox') {
  if (id === 'sandbox') return sandbox;
  const p = planned.find(x => x.id === id);
  const err = new Error(p ? 'provider_not_connected' : 'unknown_provider'); err.status = 501; throw err;
}
function listProviders() {
  return [{ id: 'sandbox', label: sandbox.label, connected: true, real: false }, ...planned.map(p => ({ id: p.id, label: p.label, connected: false, real: true, requires: p.requires }))];
}
module.exports = { getProvider, listProviders };
