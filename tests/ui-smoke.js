'use strict';
// Browser smoke test (needs Playwright; not part of `npm test`). Usage: node tests/ui-smoke.js [screenshotDir]
const { start } = require('./helper');
const { chromium } = require('playwright');
(async () => {
  const t = await start(); const shots = process.argv[2];
  const browser = await chromium.launch(); const errors = []; let checked = 0;
  async function session(role, email, pw, routes, vp = { width: 390, height: 844 }) {
    const ctx = await browser.newContext({ viewport: vp, locale: 'so-SO' }); const page = await ctx.newPage();
    page.on('pageerror', e => errors.push(`[${role}] pageerror: ${e.message}`));
    page.on('console', m => { if (m.type() === 'error' && !/401|403|404|409|402|Failed to load resource/.test(m.text())) errors.push(`[${role}] console: ${m.text()}`); });
    await page.goto(t.base + '/#/'); 
    if (email) await page.evaluate(async ([e, p]) => { await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: e, password: p }) }); }, [email, pw]);
    for (const r of routes) {
      await page.goto(t.base + '/#' + r); await page.reload(); await page.waitForSelector('#view h2, #view .empty, #view h1', { timeout: 8000 }).catch(() => errors.push(`[${role}] no content for ${r}`));
      await page.waitForTimeout(150);
      const txt = await page.locator('#view').innerText();
      if (/Something went wrong|undefined|\[object/.test(txt)) errors.push(`[${role}] bad text on ${r}: ${txt.slice(0, 120)}`);
      checked++;
      if (shots && r.length < 40) await page.screenshot({ path: `${shots}/${role}-${r.replace(/[^a-z0-9]/gi, '_')}.png` });
    }
    return page;
  }
  const cardId = t.store.find('cards', c => c.status === 'published').id; const hospId = t.store.find('orgs', o => o.type === 'hospital').id;
  const caseId = t.store.col('cases')[0].id;
  const guest = await session('guest', null, null, ['/', '/cards', '/cards/' + cardId, '/hospitals', '/hospitals/' + hospId, '/services', '/emergency', '/map', '/login', '/register', '/register-org', '/privacy']);
  await guest.goto(t.base + '/#/map'); await guest.reload(); await guest.waitForSelector('.tm-locate', { timeout: 8000 }).catch(() => errors.push('map: current-location control was not rendered'));
  await guest.evaluate(() => Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition: done => done({ coords: { latitude: 11.2842, longitude: 49.1816 } }) } }));
  await guest.locator('.tm-locate').click();
  await guest.waitForSelector('.mk-user-location', { timeout: 3000 }).catch(() => errors.push('map: current-location marker was not shown'));
  const locationNotice = await guest.locator('.tm-loc-status').innerText().catch(() => '');
  if (!locationNotice.includes('GURMAD 24')) errors.push('map: current-location privacy notice was not shown');
  // Puntland map: list selection opens place details with a call link and directions.
  await guest.locator('.pm-row').first().click();
  await guest.waitForSelector('.pm-card a[href^="tel:"]', { timeout: 5000 }).catch(() => errors.push('map: place details did not open'));
  const firstPhoneHref = await guest.locator('.pm-card a[href^="tel:"]').getAttribute('href').catch(() => '');
  if (!/\\d/.test(firstPhoneHref)) errors.push('map: place phone link did not retain its digits');
  await guest.fill('.pm-tools input', 'zzzz-no-match');
  await guest.waitForFunction(() => document.querySelectorAll('.pm-row').length === 0, null, { timeout: 3000 }).catch(() => errors.push('map: search did not filter the list'));
  await guest.fill('.pm-tools input', '');
  await guest.locator('.chip').filter({ hasText: 'Tixraacyada directory-ga' }).click();
  await guest.locator('.pm-row').filter({ hasText: 'University Teaching Hospital Galkayo' }).click();
  const referenceDetails = await guest.locator('.pm-card').innerText();
  if (!/lama xaqiijin/i.test(referenceDetails)) errors.push('map: directory POI was not clearly labelled unverified');
  if (!referenceDetails.includes('Public place directory')) errors.push('map: directory POI source was not shown');
  // Marketplace cards expose a working details action.
  await guest.goto(t.base + '/#/cards'); await guest.reload();
  await guest.locator('#view .hc button.ghost').first().click();
  await guest.waitForFunction(() => document.querySelector('#view')?.innerText.includes('Adeegyada ku jira') || document.querySelector('#view')?.innerText.includes('Included services'), null, { timeout: 5000 }).catch(() => errors.push('cards: details action did not open the card detail page'));

  const pg = await session('patient', 'patient@demo.gurmad24.test', 'DemoPass12345', ['/', '/me/orders', '/me/appointments', '/me/support', '/me/account']);
  // full order flow through the UI
  await pg.goto(t.base + '/#/cards/' + cardId); await pg.reload(); await pg.click('text=/Dalbo kaarkan/'); await pg.click('.pay-tile >> nth=1'); await pg.fill('.modal input[type=tel]', '612345678'); await pg.check('#ord_terms'); await pg.click('.pay-btn');
  await pg.waitForSelector('.cardpass .cp-qr svg', { timeout: 8000 }).catch(() => errors.push('order flow: no digital card shown'));
  await session('hospital', 'hospital@demo.gurmad24.test', 'DemoPass12345', ['/org', '/org/cards', '/org/verify', '/org/services', '/org/appointments', '/org/sales', '/org/subscription', '/org/complaints', '/org/profile', '/account']);
  await session('ambulance', 'ambulance@demo.gurmad24.test', 'DemoPass12345', ['/org', '/org/requests', '/org/services', '/org/sales', '/org/subscription']);
  await session('operator', 'operator@demo.gurmad24.test', 'DemoPass12345', ['/ops', '/ops/case/' + caseId, '/ops/directory']);
  await session('admin', 'admin@test.local', 'AdminPass123', ['/admin', '/admin/orgs', '/admin/users', '/admin/cards', '/admin/finance', '/admin/finance?tab=orders', '/admin/finance?tab=invoices', '/admin/finance?tab=statements', '/admin/revenue', '/admin/revenue?period=year', '/admin/settings', '/admin/complaints', '/admin/audit', '/account'], { width: 1100, height: 800 });
  await browser.close(); await t.stop();
  console.log(`routes checked: ${checked}`); console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'No browser errors.'); process.exit(errors.length ? 1 : 0);
})();
