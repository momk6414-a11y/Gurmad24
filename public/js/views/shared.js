// Shared view pieces (receipts, invoices).
import { t, h, money, fdt, fdate, toast, icon } from '../core.js';
import { qrPath } from '../qr.js';

export function receiptNode(d) {
  return h('div', { class: 'receipt' },
    h('span', { class: 'stamp' }, t('DEMO - NO REAL PAYMENT')),
    h('h3', d.kind === 'receipt' ? t('Receipt') : d.kind === 'credit' ? t('Credit note') : d.kind === 'statement' ? t('Settlement statement') : t('Invoice')),
    h('div', d.number), h('small', fdt(d.ts)),
    h('table', h('tbody', d.lines.map(l => h('tr', h('td', l.desc), h('td', { style: 'text-align:right' }, money(l.amountCents)))), h('tr', { class: 'tot' }, h('td', t('Total')), h('td', { style: 'text-align:right' }, money(d.totalCents))))),
    h('small', d.notice));
}

// ---- Digital health card (wallet pass) with QR code. The QR holds only a verify link, never personal data.
export const verifyUrl = code => location.origin + '/#/verify/' + code;
const PAY_NAME = { evc: 'EVC Plus', zaad: 'Zaad', edahab: 'eDahab', card: 'Card' };
export const payName = m => PAY_NAME[m] || '';
const STATE_TXT = { active: 'Active', expired: 'Expired', refunded: 'Refunded' };

function qrSvgString(code, px) {
  const { d, size } = qrPath(verifyUrl(code));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${px}" height="${px}" shape-rendering="crispEdges" role="img" aria-label="QR"><rect width="${size}" height="${size}" fill="#fff"/><path d="${d}" fill="#0b1f33"/></svg>`;
}

async function downloadCardPng(o) {
  const W = 900, H = 560, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#0b5d4b'); g.addColorStop(1, '#0b1f33');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.fillStyle = '#fff'; x.font = '700 30px sans-serif'; x.fillText('GURMAD 24', 48, 70);
  x.font = '600 36px sans-serif'; x.fillText(o.cardSnapshot.name, 48, 150);
  x.font = '400 26px sans-serif'; x.fillStyle = '#cfe9e1'; x.fillText(o.cardSnapshot.hospitalName, 48, 196);
  x.fillStyle = '#fff'; x.font = '400 24px sans-serif'; x.fillText((o.holderName || ''), 48, 300); x.fillText(t('Valid until') + ': ' + fdate(o.validUntil), 48, 340);
  x.font = '700 32px monospace'; x.fillText(o.cardCode, 48, 480);
  x.fillStyle = '#fff'; x.fillRect(560, 150, 300, 300);
  const img = new Image(); const blob = new Blob([qrSvgString(o.cardCode, 280)], { type: 'image/svg+xml' }); const url = URL.createObjectURL(blob);
  await new Promise((ok, no) => { img.onload = ok; img.onerror = no; img.src = url; });
  x.drawImage(img, 570, 160, 280, 280); URL.revokeObjectURL(url);
  x.fillStyle = '#cfe9e1'; x.font = '400 18px sans-serif'; x.fillText(t('Demo card - sandbox payment'), 48, 530);
  const a = document.createElement('a'); a.download = o.cardCode + '.png'; a.href = c.toDataURL('image/png'); document.body.appendChild(a); a.click(); a.remove();
}

export function cardPass(o, { compact = false } = {}) {
  const state = o.cardState || 'active';
  const qr = h('div', { class: 'cp-qr' }); qr.innerHTML = qrSvgString(o.cardCode, compact ? 120 : 168);
  const share = async () => {
    const url = verifyUrl(o.cardCode), text = o.cardSnapshot.name + ' - ' + o.cardCode;
    try { if (navigator.share) { await navigator.share({ title: 'GURMAD 24', text, url }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(text + ' ' + url); toast(t('Copied')); } catch (e) { toast(url); }
  };
  return h('div', { class: 'cardpass ' + state },
    h('div', { class: 'cp-top' }, h('span', { class: 'cp-brand' }, icon('shield', 16), ' GURMAD 24'), h('span', { class: 'cp-state' }, t(STATE_TXT[state] || state))),
    h('div', { class: 'cp-body' },
      h('div', { class: 'cp-info' }, h('h3', o.cardSnapshot.name), h('div', { class: 'cp-hosp' }, o.cardSnapshot.hospitalName),
        h('div', { class: 'cp-holder' }, o.holderName || ''), h('div', { class: 'cp-valid' }, t('Valid until') + ': ' + fdate(o.validUntil)),
        h('div', { class: 'cp-code mono' }, o.cardCode)), qr),
    compact ? null : h('div', { class: 'actions' },
      h('button', { class: 'btn sm', onclick: () => downloadCardPng(o).catch(() => toast(t('Could not save the image'), 'err')) }, icon('download'), t('Save as image')),
      h('button', { class: 'btn sm ghost', onclick: share }, t('Share'))),
    h('small', { class: 'cp-note' }, t('Show this code at the hospital. Demo card: sandbox payment, not insurance.')));
}
