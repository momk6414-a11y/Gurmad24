'use strict';
// GURMAD 24 assistant. Answers from LIVE system data with a local rule engine (Somali + English).
// If ANTHROPIC_API_KEY is set it can ask a language model instead (see llmAnswer); any failure falls back to the local engine.
const R = require('./responders');

const has = (s, words) => words.some(w => s.includes(w));
const norm = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');

const T = {
  so: {
    hi: 'Salaan! Waxaan ahay kaaliyaha GURMAD 24. Waxaan kaa caawin karaa gurmad, isbitaallo, kaararka caafimaadka, ballamo, iyo cabashooyin. Maxaad rabtaa inaad ogaato?',
    emergency: 'Haddii ay tahay xaalad degdeg ah oo dhab ah, toos u tag isbitaalka ugu dhow ama wac adeegga degdegga ah. Nidaamkan waa TIJAABO, ma dirayo gurmad dhab ah. Si aad u tijaabiso: fur bogga Degdegga, dooro adeegga (ambalaas, booliis ama dab-damis), kaxee goobtaada ama dooro aag, ama duub codkaaga, kadibna dir codsiga.',
    voice: 'Bogga Degdegga waxaad ka heli doontaa badhanka "Duub codkaaga" (ugu badnaan 15 ilbiriqsi). Waxaad ku sharxi kartaa xaaladda hadal ahaan, hawlgeluhuna wuu dhegaysan karaa. Microphone-ka waa in aad ogolaataa.',
    hospitals: 'Isbitaallada la xaqiijiyey',
    cards: 'Kaararka caafimaadka ee ugu jaban',
    cardsNote: 'Kaararku ma aha caymis; waa alaab isbitaalku bixiyo.',
    appt: 'Si aad ballan u qabsato: fur bogga isbitaalka, guji "Codso ballan", dooro adeegga iyo waqtiga. Waxaad u baahan tahay inaad gasho akoonkaaga.',
    complaint: 'Cabasho ama su\'aal ku dir bogga Taageerada (Support). Waxaad u baahan tahay inaad gasho akoonkaaga, kooxdayadana waxay kuugu jawaabi doontaa gudaha app-ka.',
    pay: 'Lacag bixintu waa tijaabo (sandbox) hadda: lacag dhab ah lama jaro.',
    privacy: 'Xogtaada kuma iibino. Goobtaada waa ikhtiyaari, waxaana loo isticmaalaa oo keliya codsiga gurmadka. Waad soo dejin kartaa ama tirtiri kartaa xogtaada.',
    map: 'Khariidadda Puntland waxay muujisaa sawirrada satellite-ka iyo goobaha isbitaallada, ambalaasyada, booliiska iyo dab-damiska.',
    status: 'Hadda nidaamka',
    medical: 'Ma ahi dhakhtar, mana ogi cudurka. Haddii xaaladdu halis tahay (dhiig bax, neefsasho oo adag, miyir beel, nuugis xanuun), isla markiiba u tag isbitaalka ugu dhow ama wac ambalaas.',
    nearest: 'Isbitaalka ugu dhow',
    unknown: 'Fiiro: ma fahmin si buuxda. Waxaan kaa caawin karaa: gurmad, isbitaallo, kaararka caafimaadka, ballamo, cabashooyin, khariidad, iyo xaaladda nidaamka. Isku day inaad si kale u weydiiso.',
    free: 'Diyaar', cheapest: 'qiimo', tel: 'Tel',
  },
  en: {
    hi: 'Hello! I am the GURMAD 24 assistant. I can help with emergency requests, hospitals, health cards, appointments and complaints. What would you like to know?',
    emergency: 'In a real emergency go straight to the nearest hospital or call your local emergency services. This system is a TEST and sends no real help. To try it: open the Emergency page, pick a service (ambulance, police or fire), share your location or choose an area, optionally record your voice, then send the request.',
    voice: 'On the Emergency page there is a "Record your voice" button (up to 15 seconds). Describe the situation by speaking and the operator can listen. You need to allow the microphone.',
    hospitals: 'Verified hospitals',
    cards: 'Cheapest health cards',
    cardsNote: 'Cards are not insurance; they are products set by the hospital.',
    appt: 'To book: open a hospital page, press "Request appointment", choose the service and time. You need to be logged in.',
    complaint: 'Send a complaint or question from the Support page. You need to be logged in; our team replies inside the app.',
    pay: 'Payments are sandbox only right now: no real money is charged.',
    privacy: 'We never sell your data. Location is optional and used only for the emergency request. You can download or delete your data.',
    map: 'The Puntland map shows satellite imagery and the places of hospitals, ambulances, police and fire stations.',
    status: 'System right now',
    medical: 'I am not a doctor and cannot diagnose. If it is serious (bleeding, trouble breathing, unconsciousness, chest pain) go to the nearest hospital or call an ambulance immediately.',
    nearest: 'Nearest hospital',
    unknown: 'I did not fully understand. I can help with emergencies, hospitals, health cards, appointments, complaints, the map and system status. Try asking another way.',
    free: 'Available', cheapest: 'price', tel: 'Tel',
  },
};

const SOMALI_HINT = ['salaan', 'waa', 'maxaa', 'sidee', 'isbital', 'gurmad', 'ambalaas', 'booliis', 'dab', 'kaar', 'ballan', 'cabasho', 'caawin', 'fadlan', 'bukaan', 'xanuun', 'halkee', 'qiimo', 'lacag', 'codsi', 'cod', 'iyo', 'ma ', 'kaa', 'aan', 'rabaa', 'rabto', 'degdeg', 'khariid'];

function answer(store, config, message, langHint) {
  const q = norm(message);
  const lang = has(q, SOMALI_HINT) ? 'so' : (langHint === 'so' && !/[a-z]{4,}\s+[a-z]{4,}\s+(the|please|what|how)/.test(q) ? 'so' : (has(q, ['hello', 'help', 'what', 'how', 'where', 'please', 'hospital', 'emergency', 'card']) ? 'en' : (langHint === 'en' ? 'en' : 'so')));
  const L = T[lang];
  const orgs = store.col('orgs').filter(o => o.status === 'verified');
  const out = { lang, reply: '', actions: [], items: [] };
  const act = (label, href) => out.actions.push({ label, href });
  const area = R.AREAS.find(a => q.includes(norm(a.name)));
  const hospitals = orgs.filter(o => o.type === 'hospital');
  const listOrgs = (title, list) => { out.items = list.map(o => ({ name: o.name, area: o.area, phone: o.phone || '', tel: (o.phone || '').replace(/[^+\d]/g, '') })); out.reply = title + ':'; };

  if (!q.trim()) { out.reply = L.hi; return out; }
  if (has(q, ['salaan', 'hello', 'hi ', 'hey', 'asc', 'subax', 'galab', 'good morning']) && q.length < 25) { out.reply = L.hi; return out; }

  if (has(q, ['cod', 'voice', 'duub', 'record', 'hadal', 'microphone', 'mic'])) { out.reply = L.voice; act(lang === 'so' ? 'Fur Degdegga' : 'Open Emergency', '#/emergency'); return out; }
  if (has(q, ['xanuun', 'dhiig', 'neef', 'miyir', 'jiran', 'bukaan', 'sick', 'pain', 'bleed', 'breath', 'unconscious', 'pregnan', 'uur', 'foolid', 'dhalm', 'symptom', 'calaamad', 'dhakhtar', 'doctor'])
      && !has(q, ['isbital', 'hospital', 'kaar', 'card', 'ballan', 'appoint'])) {
    out.reply = L.medical; act(lang === 'so' ? 'Codso gurmad (tijaabo)' : 'Request help (demo)', '#/emergency');
    return out;
  }
  if (has(q, ['gurmad', 'ambalaas', 'ambulance', 'emergency', 'degdeg', 'booliis', 'police', 'dab', 'fire', 'help me', 'caawi', 'argagax', 'shil', 'accident', 'rescue', 'badbaad'])) {
    out.reply = L.emergency; act(lang === 'so' ? 'Fur Degdegga' : 'Open Emergency', '#/emergency');
    const types = ['ambulance', 'police', 'fire'];
    out.items = types.map(tp => { const l = orgs.filter(o => o.type === tp && o.phone); const o = l.find(x => x.available) || l[0]; return o ? { name: o.name, area: o.area, phone: o.phone, tel: o.phone.replace(/[^+\d]/g, '') } : null; }).filter(Boolean);
    return out;
  }
  if (has(q, ['isbital', 'hospital', 'clinic', 'rugta', 'dhakhtar', 'ugu dhow', 'nearest', 'near', 'dhow'])) {
    const list = area ? hospitals.filter(h => norm(h.area).includes(norm(area.name))) : hospitals;
    listOrgs(has(q, ['dhow', 'near']) ? L.nearest : L.hospitals, (list.length ? list : hospitals).slice(0, 5));
    act(lang === 'so' ? 'Dhammaan isbitaallada' : 'All hospitals', '#/hospitals'); act(lang === 'so' ? 'Khariidad' : 'Map', '#/map');
    return out;
  }
  if (has(q, ['kaar', 'card', 'qiimo', 'price', 'cost', 'jaban', 'cheap', 'caymis', 'insurance', 'package'])) {
    const cs = store.col('cards').filter(c => c.status === 'published').sort((a, b) => a.priceCents - b.priceCents).slice(0, 3);
    const cur = (store.data.settings || {}).currency || 'USD';
    out.reply = L.cards + ': ' + (cs.length ? cs.map(c => `${c.name} - ${(c.priceCents / 100).toFixed(2)} ${cur}`).join('; ') : '-') + '. ' + L.cardsNote;
    act(lang === 'so' ? 'Fiiri kaararka' : 'Browse cards', '#/cards'); return out;
  }
  if (has(q, ['ballan', 'appoint', 'book', 'ballanqaad'])) { out.reply = L.appt; act(lang === 'so' ? 'Isbitaallada' : 'Hospitals', '#/hospitals'); return out; }
  if (has(q, ['cabasho', 'complain', 'support', 'taageer', 'message', 'farriin', 'suaal', 'question'])) { out.reply = L.complaint; act(lang === 'so' ? 'Taageero' : 'Support', '#/me/support'); return out; }
  if (has(q, ['lacag', 'pay', 'evc', 'zaad', 'edahab', 'bixin'])) { out.reply = L.pay; return out; }
  if (has(q, ['xog', 'privacy', 'data', 'sir', 'amni', 'security', 'goob', 'location'])) { out.reply = L.privacy; act(lang === 'so' ? 'Ogeysiiska sirta' : 'Privacy notice', '#/privacy'); return out; }
  if (has(q, ['khariid', 'map', 'satellite', 'puntland'])) { out.reply = L.map; act(lang === 'so' ? 'Fur khariidadda' : 'Open map', '#/map'); return out; }
  if (has(q, ['nidaam', 'system', 'status', 'xaalad', 'tiro', 'maanta', 'today', 'stats', 'firfircoon'])) {
    R.advanceAll(store);
    const cs = store.col('cases'); const today = new Date().toISOString().slice(0, 10);
    const act2 = cs.filter(c => !['closed', 'cancelled', 'handed_over'].includes(c.status)).length;
    out.reply = `${L.status}: ${hospitals.length} ${lang === 'so' ? 'isbitaal' : 'hospitals'}, ${orgs.filter(o => o.type === 'ambulance').length} ${lang === 'so' ? 'ambalaas' : 'ambulance'}, ${orgs.filter(o => o.type === 'police').length} ${lang === 'so' ? 'booliis' : 'police'}, ${orgs.filter(o => o.type === 'fire').length} ${lang === 'so' ? 'dab-damis' : 'fire'}. ${lang === 'so' ? 'Codsiyada maanta' : 'Requests today'}: ${cs.filter(c => c.createdAt.slice(0, 10) === today).length}; ${lang === 'so' ? 'kuwa socda' : 'active'}: ${act2}.`;
    act(lang === 'so' ? 'Nidaamka guud' : 'System overview', '#/system'); return out;
  }
  out.reply = L.unknown; return out;
}

const LLM_SYSTEM = 'You are the GURMAD 24 assistant for a DEMO emergency-coordination and health-card marketplace in Puntland. Answer briefly in the user\'s language (Somali or English). Never diagnose or give medical advice; for urgent symptoms tell them to go to the nearest hospital or call an ambulance. Requests in this app are simulations and send no real help. Health cards are not insurance. Payments are sandbox. Do not invent facts about hospitals; use only the FACTS provided.';

async function llmAnswer(config, facts, message) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': config.anthropicKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: config.anthropicModel || 'claude-haiku-5-5', max_tokens: 400, system: LLM_SYSTEM + '\nFACTS:\n' + facts, messages: [{ role: 'user', content: String(message).slice(0, 500) }] }),
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) throw new Error('llm_' + r.status);
  const j = await r.json(); const txt = j.content && j.content[0] && j.content[0].text;
  if (!txt) throw new Error('llm_empty'); return txt;
}

module.exports = { answer, llmAnswer };
