// Floating assistant: asks /api/assistant (live data). Somali / English.
import { S, t, h, icon, POST } from './core.js';

const WELCOME = { so: 'Salaan! Waxaan ahay kaaliyaha GURMAD 24. Weydii wax kasta oo ku saabsan gurmadka, isbitaallada, kaararka, ballamaha ama cabashooyinka.', en: 'Hello! I am the GURMAD 24 assistant. Ask me about emergencies, hospitals, cards, appointments or complaints.' };
const CHIPS = { so: ['Sidee gurmad u codsadaa?', 'Isbitaalka ugu dhow', 'Kaararka ugu jaban', 'Sidee cod u duubaa?', 'Xaaladda nidaamka'], en: ['How do I request help?', 'Nearest hospital', 'Cheapest cards', 'How do I record my voice?', 'System status'] };

export function mountAssistant() {
  if (document.getElementById('ai-fab')) return;
  const log = h('div', { class: 'ai-log', role: 'log', 'aria-live': 'polite' });
  const input = h('input', { type: 'text', maxlength: 500, autocomplete: 'off', 'aria-label': t('Ask a question') });
  const chips = h('div', { class: 'ai-chips' });
  const panel = h('section', { class: 'ai-panel', id: 'ai-panel', hidden: true, 'aria-label': t('Assistant') });
  const lang = () => (S.lang === 'en' ? 'en' : 'so');
  const bubble = (who, text, extra) => { const b = h('div', { class: 'ai-msg ' + who }, h('p', text), extra || null); log.append(b); log.scrollTop = log.scrollHeight; return b; };
  const drawChips = () => chips.replaceChildren(...CHIPS[lang()].map(c => h('button', { type: 'button', class: 'chip', onclick: () => ask(c) }, c)));
  async function ask(text) {
    text = (text || input.value).trim(); if (!text) return; input.value = ''; bubble('me', text);
    const wait = bubble('bot', '...');
    try {
      const r = await POST('/assistant', { message: text, lang: lang() });
      const extra = h('div');
      if (r.items && r.items.length) extra.append(h('ul', { class: 'ai-items' }, r.items.map(i => h('li', h('b', i.name), i.area ? ' - ' + i.area : '', i.tel ? h('a', { class: 'tel', href: 'tel:' + i.tel }, icon('phone', 14), ' ' + i.phone) : null))));
      if (r.actions && r.actions.length) extra.append(h('div', { class: 'actions tight' }, r.actions.map(a => h('a', { class: 'btn sm ghost', href: a.href, onclick: () => { panel.hidden = true; } }, a.label))));
      wait.replaceWith(h('div', { class: 'ai-msg bot' }, h('p', r.reply), extra));
    } catch (_) { wait.replaceWith(h('div', { class: 'ai-msg bot' }, h('p', navigator.onLine ? t('Something went wrong.') : 'OFFLINE'))); }
    log.scrollTop = log.scrollHeight;
  }
  panel.append(h('header', h('b', icon('bot', 18), ' ', t('Assistant')), h('button', { type: 'button', class: 'btn sm ghost', 'aria-label': t('Close'), onclick: () => { panel.hidden = true; } }, '×')), log, chips,
    h('form', { class: 'ai-form', onsubmit: ev => { ev.preventDefault(); ask(); } }, input, h('button', { class: 'btn sm', type: 'submit', 'aria-label': t('Send') }, icon('send', 16))),
    h('small', { class: 'hint ai-note' }, t('Demo assistant. It gives general information, not medical advice.')));
  const fab = h('button', { id: 'ai-fab', type: 'button', class: 'ai-fab', 'aria-controls': 'ai-panel', 'aria-label': t('Assistant'), onclick: () => {
    panel.hidden = !panel.hidden;
    if (!panel.hidden) { if (!log.children.length) { bubble('bot', WELCOME[lang()]); } drawChips(); input.focus(); }
  } }, icon('bot', 24));
  document.body.append(fab, panel);
}
