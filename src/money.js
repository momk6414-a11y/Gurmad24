'use strict';
// All money is integer minor units (cents). Rates are basis points (100 bps = 1%).
function commissionCents(amountCents, rateBps) {
  if (!Number.isInteger(amountCents) || amountCents < 0) throw new Error('bad_amount');
  if (!Number.isInteger(rateBps) || rateBps < 0 || rateBps > 5000) throw new Error('bad_rate');
  return Math.round(amountCents * rateBps / 10000);
}

function addMonths(iso, n) {
  const d = new Date(iso); const day = d.getUTCDate();
  d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + n);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d.toISOString();
}

// Subscription price + term from a plan. Annual uses the plan's own annual price.
function computeSubscription(plan, period, startIso) {
  if (!plan || !plan.active) throw new Error('plan_unavailable');
  if (!['monthly', 'annual'].includes(period)) throw new Error('bad_period');
  const priceCents = period === 'monthly' ? plan.monthlyCents : plan.annualCents;
  const months = period === 'monthly' ? 1 : 12;
  return { priceCents, startsAt: startIso, endsAt: addMonths(startIso, months) };
}

const fmt = c => (c / 100).toFixed(2);
module.exports = { commissionCents, computeSubscription, addMonths, fmt };
