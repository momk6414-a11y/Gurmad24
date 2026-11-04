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
  await session('guest', null, null, ['/', '/cards', '/cards/' + cardId, '/hospitals', '/hospitals/' + hospId, '/services', '/emergency', '/login', '/register', '/register-org', '/privacy']);
  const pg = await session('patient', 'patient@demo.gurmad24.test', 'DemoPass12345', ['/', '/me/orders', '/me/appointments', '/me/support', '/me/account']);
  // full order flow through the UI
  await pg.goto(t.base + '/#/cards/' + cardId); await pg.reload(); await pg.click('text=/Dalbo kaarkan/'); await pg.check('#f_acceptTerms'); await pg.click('button:has-text("Gudbi dalab tijaabo")');
  await pg.waitForSelector('.receipt', { timeout: 8000 }).catch(() => errors.push('order flow: no receipt shown'));
  await session('hospital', 'hospital@demo.gurmad24.test', 'DemoPass12345', ['/org', '/org/cards', '/org/services', '/org/appointments', '/org/sales', '/org/subscription', '/org/complaints', '/org/profile', '/account']);
  await session('ambulance', 'ambulance@demo.gurmad24.test', 'DemoPass12345', ['/org', '/org/requests', '/org/services', '/org/sales', '/org/subscription']);
  await session('operator', 'operator@demo.gurmad24.test', 'DemoPass12345', ['/ops', '/ops/case/' + caseId, '/ops/directory']);
  await session('admin', 'admin@test.local', 'AdminPass123', ['/admin', '/admin/orgs', '/admin/users', '/admin/cards', '/admin/finance', '/admin/finance?tab=orders', '/admin/finance?tab=invoices', '/admin/finance?tab=statements', '/admin/revenue', '/admin/revenue?period=year', '/admin/settings', '/admin/complaints', '/admin/audit', '/account'], { width: 1100, height: 800 });
  await browser.close(); await t.stop();
  console.log(`routes checked: ${checked}`); console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'No browser errors.'); process.exit(errors.length ? 1 : 0);
})();
