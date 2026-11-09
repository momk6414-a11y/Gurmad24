'use strict';
// Starter catalogue: gives every hospital a sensible list of services and health cards for its specialty,
// so no hospital page is empty. PRICES ARE PLACEHOLDERS (USD cents) - each hospital edits them in its own dashboard.
// Idempotent: a hospital that already has services (or cards) is never touched, and edits are never overwritten.

const NOTE = 'Qiimo tusaale ah - isbitaalku wuu beddeli karaa.';
const TERMS = 'DEMO TEXT: Shuruudaha waxaa qora oo ansixiya isbitaalka. Kaarkani waa alaab adeeg isbitaal, ma aha caymis, mana damaanad qaadayo daaweyn ama daboolid.';
const REFUND = 'DEMO TEXT: Shuruudaha lacag-celinta waxaa dejiya isbitaalka; codsiyada waxaa dib u eega maamulayaasha GURMAD 24.';

// s = [name, priceCents, note]; c = [name, priceCents, validityDays, included, excluded, eligibility]
const CATALOG = {
  eye: {
    label: 'Indhaha',
    match: /\beye\b|eyes|ophthal|optic|ocul|indha/i,
    services: [
      ['Baadhitaanka indhaha (la-tashi)', 500], ['Baadhitaanka aragga iyo ukumidda muraayadaha', 600], ['Cabbirka cadaadiska indhaha (glaucoma)', 700],
      ['Baadhitaanka dhabarka indhaha (retina)', 1500], ['Daaweynta caabuqa indhaha', 400], ['Ka saarista wax indhaha ku dhegay', 800],
      ['Qalinka jeexa (cataract) - la-tashi iyo qorshe', 1000], ['Baadhitaan indhaha carruurta', 500],
    ],
    cards: [
      ['Kaarka Baadhitaanka Indhaha', 800, 90, ['Hal baadhitaan indhaha', 'Cabbirka aragga', 'Talo muraayado'], ['Qalliin', 'Daawooyin', 'Muraayad lafteeda'], 'Dadka waaweyn iyo carruurta'],
      ['Kaarka Qoyska ee Indhaha', 2400, 180, ['Ilaa 4 baadhitaan indhaha', 'Cabbirka cadaadiska indhaha', 'Baadhitaan carruurta'], ['Qalliin', 'Gurmad degdeg ah'], 'Qoys ilaa 4 qof'],
      ['Kaarka Sokorowga iyo Indhaha', 1500, 365, ['Laba baadhitaan oo retina ah', 'Cabbirka cadaadiska indhaha', 'Xusuusin ballan'], ['Qalliin', 'Laser'], 'Dadka qaba sokorow'],
    ],
  },
  dental: {
    label: 'Ilkaha',
    match: /dental|dentist|\bdent\b|tooth|teeth|ilko/i,
    services: [
      ['Baadhitaanka ilkaha', 400], ['Nadiifinta ilkaha', 800], ['Buuxinta ilkaha (filling)', 1200], ['Ka saarista ilig', 700],
      ['Daaweynta xididka ilkaha', 3000], ['Ilkaha oo la caddeeyo', 2500], ['Baadhitaanka ilkaha carruurta', 400],
    ],
    cards: [
      ['Kaarka Baadhitaanka Ilkaha', 600, 90, ['Hal baadhitaan', 'Talo daryeel ilkaha'], ['Buuxin', 'Qalliin', 'Ilko been abuur ah'], 'Dadka waaweyn iyo carruurta'],
      ['Kaarka Nadiifinta Ilkaha', 1200, 180, ['Baadhitaan', 'Nadiifin hal mar ah'], ['Buuxin', 'Daaweynta xididka'], 'Dadka waaweyn'],
      ['Kaarka Qoyska ee Ilkaha', 2800, 365, ['Ilaa 4 baadhitaan', '2 nadiifin', 'Baadhitaan carruurta'], ['Qalliin', 'Ilko been abuur ah'], 'Qoys ilaa 4 qof'],
    ],
  },
  pediatric: {
    label: 'Carruurta',
    match: /child|children|pediatr|paediatr|kids|caruur|ilmo/i,
    services: [
      ['La-tashiga dhakhtarka carruurta', 400], ['Baadhitaanka koritaanka iyo miisaanka', 500], ['Tallaalada carruurta (adeegga)', 300],
      ['Daaweynta qandhada iyo caabuqa', 500], ['Baadhitaanka nafaqada carruurta', 600], ['Daawaynta xanuunka caloosha ilmaha', 500],
    ],
    cards: [
      ['Kaarka Booqashada Carruurta', 500, 90, ['Hal la-tashi', 'Miisaan iyo dherer'], ['Seexasho isbitaal', 'Qalliin', 'Daawooyin'], 'Carruurta ilaa 15 sano'],
      ['Kaarka Koritaanka Ilmaha', 1800, 180, ['Ilaa 4 booqasho', 'Baadhitaanka koritaanka', 'Talo nafaqo'], ['Gurmad degdeg ah', 'Qalliin'], 'Carruurta ilaa 5 sano'],
      ['Kaarka Qoyska ee Carruurta', 3000, 365, ['Ilaa 8 booqasho', 'Baadhitaan nafaqo', 'Xusuusin tallaal'], ['Qalliin', 'Seexasho isbitaal'], 'Qoys ilaa 4 caruur'],
    ],
  },
  maternity: {
    label: 'Hooyada iyo dhalmada',
    match: /matern|obstet|gyn|women|woman|midwi|hooy|haween|dumar|dhalm/i,
    services: [
      ['Baadhitaanka uurka (kahor dhalmo)', 500], ['Ultrasound-ka uurka', 1000], ['Baadhitaanka dhiigga hooyada uurka leh', 800],
      ['Dhalmada caadiga ah - la-tashi iyo qorshe', 1500], ['Daryeelka kadib dhalmada', 600], ['La-tashiga qorshaynta qoyska', 300],
    ],
    cards: [
      ['Kaarka Daryeelka Uurka', 2000, 270, ['Ilaa 4 booqasho uur', 'Hal ultrasound', 'Baadhitaan dhiig'], ['Dhalmo', 'Qalliin', 'Gurmad degdeg ah'], 'Hooyooyinka uurka leh'],
      ['Kaarka Kadib Dhalmada', 900, 90, ['Laba booqasho', 'Daryeel ilmaha cusub'], ['Qalliin', 'Seexasho isbitaal'], 'Hooyooyinka dhashay'],
      ['Kaarka Booqashada Haweenka', 500, 90, ['Hal la-tashi', 'Talo qorshaynta qoyska'], ['Qalliin', 'Daawooyin'], 'Haweenka waaweyn'],
    ],
  },
  heart: {
    label: 'Wadnaha',
    match: /cardi|heart|wadne/i,
    services: [
      ['La-tashiga dhakhtarka wadnaha', 800], ['ECG (baadhitaanka korontada wadnaha)', 1000], ['Cabbirka dhiig-karka', 300], ['Echo-ga wadnaha', 3000], ['Baadhitaanka kolestarolka', 800],
    ],
    cards: [
      ['Kaarka Baadhitaanka Wadnaha', 1500, 90, ['La-tashi', 'ECG', 'Cabbirka dhiig-karka'], ['Echo', 'Qalliin', 'Gurmad degdeg ah'], 'Dadka waaweyn'],
      ['Kaarka Kormeerka Dhiig-karka', 2500, 180, ['Ilaa 4 booqasho', 'Cabbirka dhiig-karka', 'ECG hal mar'], ['Qalliin', 'Daawooyin'], 'Dadka qaba dhiig-kar'],
    ],
  },
  general: {
    label: 'Isbitaal guud',
    match: /./,
    services: [
      ['La-tashi guud (dhakhtar)', 500], ['Baaritaanka guud (check-up)', 1500], ['Booqasho dib-u-eeg ah', 300], ['Daweynta caabuqyada iyo qandhada', 600],
      ['Daaweynta dhaawacyada yaryar', 800], ['Cabbirka dhiig-karka iyo sokorta', 300], ['Ultrasound guud', 1200], ['Seexasho isbitaal (qiimaha maalintii)', 2000],
    ],
    cards: [
      ['Kaarka Booqashada', 500, 90, ['Hal la-tashi guud'], ['Gurmad degdeg ah', 'Daawooyin', 'Qalliin'], 'Dadka waaweyn'],
      ['Kaarka Caafimaadka Qoyska', 2000, 180, ['Ilaa 4 la-tashi', 'Hal baaritaan guud'], ['Gurmad degdeg ah', 'Seexasho isbitaal'], 'Qoys ilaa 4 qof'],
      ['Kaarka Xubinimada', 1200, 365, ['Ballan mudnaan leh', '4 booqasho dib-u-eeg ah'], ['Gurmad degdeg ah', 'Qalliin'], 'Xubnaha diiwaangashan'],
    ],
  },
};
const ORDER = ['eye', 'dental', 'pediatric', 'maternity', 'heart', 'general'];

// Pick the specialty from the hospital name (the description is only used if the name tells nothing).
function specialtyOf(org) {
  for (const src of [org.name || '', org.description || '']) {
    for (const k of ORDER) if (k !== 'general' && CATALOG[k].match.test(src)) return k;
  }
  return 'general';
}

// Apply the starter catalogue to one hospital. Returns what was added.
function applyToHospital(store, org) {
  const out = { orgId: org.id, name: org.name, specialty: specialtyOf(org), services: 0, cards: 0, published: 0 };
  if (!org || org.type !== 'hospital' || ['rejected', 'suspended'].includes(org.status)) return out;
  const spec = CATALOG[out.specialty]; const now = new Date().toISOString();
  if (!store.find('services', s => s.orgId === org.id)) {
    for (const [name, priceCents, note] of spec.services) { store.insert('services', { id: store.id('sv_'), orgId: org.id, name, priceCents, note: note || NOTE, active: true, createdAt: now, isCatalogSeed: true }); out.services++; }
  }
  if (!store.find('cards', c => c.hospitalId === org.id)) {
    for (const [name, priceCents, validityDays, included, excluded, eligibility] of spec.cards) {
      store.insert('cards', { id: store.id('cd_'), hospitalId: org.id, name, priceCents, included, excluded, validityDays, eligibility, terms: TERMS, refundPolicy: REFUND, status: 'draft', hospitalApprovedAt: null, approvedBy: null, createdAt: now, updatedAt: now, isCatalogSeed: true });
      out.cards++;
    }
  }
  // Starter cards go live only for a verified hospital (same rule as the hospital's own publish button).
  if (org.status === 'verified') {
    for (const c of store.filter('cards', x => x.hospitalId === org.id && x.isCatalogSeed && x.status === 'draft' && !x.catalogPublished)) {
      c.catalogPublished = true; c.status = 'published'; c.hospitalApprovedAt = now; c.approvedBy = 'catalog'; c.updatedAt = now; out.published++;
    }
  }
  if (out.services || out.cards || out.published) store.save();
  return out;
}

function applyToAll(store) { return store.filter('orgs', o => o.type === 'hospital').map(o => applyToHospital(store, o)); }

module.exports = { CATALOG, specialtyOf, applyToHospital, applyToAll };
