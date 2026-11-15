'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const H = require('./helper');
const AI = require('../src/assistant');

test('synthetic seed organisations and cards are labelled as demo, never as verified facilities', async () => {
  const t = await H.start();
  try {
    const demoHospital = t.store.find('orgs', o => o.isDemoSeed && o.type === 'hospital');
    const demoPolice = t.store.find('orgs', o => o.isDemoSeed && o.type === 'police');
    const hospital = (await t.client().get('/api/hospitals')).data.hospitals.find(o => o.id === demoHospital.id);
    const police = (await t.client().get('/api/providers?type=police')).data.providers.find(o => o.id === demoPolice.id);
    assert.equal(hospital.demo, true);
    assert.equal(hospital.verified, false);
    assert.equal(police.demo, true);
    assert.equal(police.verified, false);

    const seedCard = t.store.find('cards', c => c.isDemoSeed && c.status === 'published');
    const card = (await t.client().get('/api/cards/' + seedCard.id)).data.card;
    assert.equal(card.demo, true);
    assert.equal(card.hospital.demo, true);
    assert.equal(card.hospital.verified, false);

    const overview = (await t.client().get('/api/overview')).data;
    assert.equal(overview.facilities.hospital, 0);
    assert.equal(overview.facilities.ambulance, 0);
    assert.equal(overview.facilities.police, 0);
    assert.equal(overview.demoFacilities.hospital, 3);
    assert.equal(overview.demoFacilities.ambulance, 2);
    assert.equal(overview.demoFacilities.police, 1);
    assert.equal(overview.demoFacilities.fire, 1);
    assert.equal(overview.cards, 0);
    assert.equal(overview.demoCards, 4);
    assert.match(overview.dataNote, /case, order and appointment counts are pilot\/demo records/i);

    const hospitalAnswer = AI.answer(t.store, t.config, 'Isbitaalka ugu dhow', 'so');
    assert.equal(hospitalAnswer.items.length, 0, 'assistant must not recommend synthetic demo hospitals as verified');
    const emergencyAnswer = AI.answer(t.store, t.config, 'How do I request an ambulance?', 'en');
    assert.equal(emergencyAnswer.items.length, 0, 'assistant must not provide synthetic demo phone numbers as real services');
    const cardAnswer = AI.answer(t.store, t.config, 'Kaararka ugu jaban', 'so');
    assert.doesNotMatch(cardAnswer.reply, /Kaarka Booqashada|Kaarka Adeegga Guud/);
  } finally {
    await t.stop();
  }
});

test('real administrator-verified hospitals remain visible and are counted separately', async () => {
  const t = await H.start();
  try {
    const admin = await H.admin(t);
    const registration = await t.client().post('/api/auth/register-org', {
      orgType: 'hospital',
      orgName: 'Verified Test Hospital',
      area: 'Gaalkacyo',
      phone: '+252611234567',
      name: 'Verified Test Manager',
      email: 'verified-hospital@trust.test',
      password: 'VerifiedTest123',
      consent: true,
    });
    assert.equal(registration.status, 201);
    const orgId = registration.data.org.id;
    assert.equal((await admin.patch('/api/admin/orgs/' + orgId, { status: 'verified' })).status, 200);

    const listed = (await t.client().get('/api/hospitals')).data.hospitals.find(o => o.id === orgId);
    assert.equal(listed.verified, true);
    assert.equal(listed.demo, false);
    const answer = AI.answer(t.store, t.config, 'Isbitaalka ugu dhow', 'so');
    assert.ok(answer.items.some(o => o.name === 'Verified Test Hospital'));

    const overview = (await t.client().get('/api/overview')).data;
    assert.equal(overview.facilities.hospital, 1);
    assert.equal(overview.demoFacilities.hospital, 3);
  } finally {
    await t.stop();
  }
});
