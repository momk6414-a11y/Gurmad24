// Shared view pieces (receipts, invoices).
import { t, h, money, fdt } from '../core.js';

export function receiptNode(d) {
  return h('div', { class: 'receipt' },
    h('span', { class: 'stamp' }, t('DEMO - NO REAL PAYMENT')),
    h('h3', d.kind === 'receipt' ? t('Receipt') : d.kind === 'credit' ? t('Credit note') : d.kind === 'statement' ? t('Settlement statement') : t('Invoice')),
    h('div', d.number), h('small', fdt(d.ts)),
    h('table', h('tbody', d.lines.map(l => h('tr', h('td', l.desc), h('td', { style: 'text-align:right' }, money(l.amountCents)))), h('tr', { class: 'tot' }, h('td', t('Total')), h('td', { style: 'text-align:right' }, money(d.totalCents))))),
    h('small', d.notice));
}
