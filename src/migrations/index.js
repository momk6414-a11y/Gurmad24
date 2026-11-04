'use strict';
// Versioned data migrations. Add new ones at the END with a higher id. Never edit old ones.
module.exports = [
  {
    id: 1, name: 'initial-settings',
    up(db) {
      db.settings = {
        currency: 'USD',
        // Rates are in basis points (100 bps = 1%). DEFAULTS ARE PLACEHOLDERS, NOT COMMERCIAL AGREEMENTS.
        cardCommissionBps: 500,
        labCommissionBps: 0,
        appointmentFeeCents: 0,
        annualDiscountNote: 'Set per plan',
        retentionDays: 365,
        placeholderValues: true,
      };
    },
  },
  {
    id: 2, name: 'org-contract-overrides',
    up(db) {
      // Per-organisation contract overrides (null = use platform default)
      for (const o of db.orgs) if (!o.contract) o.contract = { cardCommissionBps: null, labCommissionBps: null, appointmentFeeCents: null };
    },
  },
  {
    id: 3, name: 'user-privacy-fields',
    up(db) {
      for (const u of db.users) { if (u.consentAt === undefined) u.consentAt = u.createdAt || null; if (u.deletedAt === undefined) u.deletedAt = null; }
    },
  },
];
