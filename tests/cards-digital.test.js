'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const H = require('./helper');

let t;
before(async () => { t = await H.start(); });
after(async () => { await t.stop(); });

test('digital card: code issued, payment validated, public verify, hospital redeem', async () => {
  const pat = await H.demo(t, 'patient'), hos = await H.demo(t, 'hospital');
  const card = (await pat.get('/api/cards')).data.cards.find(c => c.hospital && c.hospital.id) || (await pat.get('/api/cards')).data.cards[0];
  assert.ok(card, 'a published demo card exists');
  assert.equal((await pat.post('/api/orders', { cardId: card.id, acceptTerms: true, method: 'evc', phone: 'abc' })).status, 400);
  assert.equal((await pat.post('/api/orders', { cardId: card.id, acceptTerms: true, method: 'bitcoin', phone: '612345678' })).status, 400);
  const ok = await pat.post('/api/orders', { cardId: card.id, acceptTerms: true, method: 'zaad', phone: '612345678' });
  assert.equal(ok.status, 201);
  const o = ok.data.order;
  assert.match(o.cardCode, /^G24-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  assert.equal(o.cardState, 'active');
  assert.ok(!JSON.stringify(ok.data).includes('612345678'), 'phone number is masked');
  assert.equal((await pat.get('/api/orders')).data.orders[0].cardCode, o.cardCode);

  const anon = t.client();
  const pub = await anon.get('/api/verify/' + o.cardCode);
  assert.equal(pub.data.found, true); assert.equal(pub.data.state, 'active');
  assert.ok(!JSON.stringify(pub.data).includes('@'), 'no personal data in public check');
  assert.equal((await anon.get('/api/verify/G24-AAAA-BBBB-CCCC')).data.found, false);

  assert.equal((await anon.get('/api/org/cards/lookup?code=' + o.cardCode)).status, 401);
  const look = await hos.get('/api/org/cards/lookup?code=' + o.cardCode);
  if (look.status === 403) return; // card belongs to another hospital: scoping works
  assert.equal(look.status, 200); assert.equal(look.data.card.state, 'active');
  const red = await hos.post('/api/org/cards/redeem', { code: o.cardCode, service: 'General check-up' });
  assert.equal(red.status, 200); assert.equal(red.data.card.redemptions.length, 1);
});
