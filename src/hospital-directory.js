'use strict';

// Public directory leads from Isbitaal.com. These are NOT administrator-verified facilities.
// Preserve each public listing as published; identical phone numbers are flagged, not silently merged.
const SOURCE = 'https://isbitaal.com/isbitaal/gaalkacyo/';
const NOTE = 'Liis dadweyne oo aan weli isbitaalka si toos ah looga xaqiijin. Wac si aad u hubiso magaca, lambarka, goobta iyo adeegyada.';
const OPEN_24H = new Set(['daacad', 'daryeel', 'galkayo-hospital-galmudug', 'gmc', 'horeeye', 'modern', 'mudug-regional', 'ramadan', 'royal-family', 'shifo', 'wadani']);
const rows = [
  ['daacad', 'Daacad Hospital', '+252 61 220 5599'],
  ['daru-dabib', 'Daru-Dabib Hospital', '+252 61 404 0207'],
  ['daryeel', 'Daryeel Speciality Hospital and Diagnostic Center', '+252 90 768 4039', 'Magacu wuxuu tilmaamayaa adeegyo takhasus iyo baaritaan; faahfaahinta lama xaqiijin.'],
  ['digfeer', 'Digfeer Eye Specialist Hospital', '+252 90 765 8641', 'Magacu wuxuu tilmaamayaa takhasuska indhaha; adeegyada hadda jira lama xaqiijin.'],
  ['galkayo-general', 'Galkayo General Hospital', '+252 61 782 0040', '', 'Hobyo Street (liis dadweyne)', 'Waxaa jira liis kale oo isla lambarkan wata; suuragal inay isku xarun yihiin.'],
  ['galkayo-hospital-galmudug', 'Galkayo Hospital - Galmudug', '+252 61 782 0040', '', '', 'Waxaa jira liis kale oo isla lambarkan wata; suuragal inay isku xarun yihiin.'],
  ['gmc', 'GMC Hospital - Galkacyo Medical Center', '+252 90 470 6666', 'Magacu wuxuu tilmaamayaa xarun caafimaad; takhasusyada lama xaqiijin.'],
  ['hayaat', 'Hayaat Hospital Galkacyo', '+252 90 664 6499'],
  ['horeeye', 'Horeeye Multispecialty Hospital', '+252 90 775 9796', 'Magacu wuxuu tilmaamayaa adeegyo takhasusyo badan; waaxyaha lama xaqiijin.'],
  ['modern', 'Modern Hospital', '+252 90 679 5131', '', 'Gaalkacyo; cinwaanka saxda ah lama xaqiijin.'],
  ['mudug-regional', 'Mudug Regional Hospital', '+252 90 779 5891'],
  ['ramadan', 'Ramadan Hospital Galkacyo', '+252 90 537 3131', '', 'Wadajir District, Hobyo Street (liis dadweyne)'],
  ['royal-family', 'Royal Family Hospital', '+252 90 705 6667'],
  ['shifo', 'Shifo Hospital Galkacyo', '+252 90 738 6583'],
  ['shifo-specialist', 'Shifo Specialist Hospital', '+252 90 686 0404', 'Magacu wuxuu tilmaamayaa adeeg takhasus; waaxda gaarka ah lama xaqiijin.'],
  ['wadani', 'Wadani Specialist Hospital', '+252 90 776 6666', 'Magacu wuxuu tilmaamayaa adeeg takhasus; waaxda gaarka ah lama xaqiijin.'],
  ['wadatal', 'Wadatal General Hospital', '+252 61 976 6665'],
];

const DIRECTORY = rows.map(([id, name, phone, serviceNote = '', address = '', duplicateNote = '']) => ({
  id: 'public-' + id,
  name,
  type: 'hospital',
  area: 'Gaalkacyo',
  phone,
  address: address || null,
  publicEmail: id === 'galkayo-general' ? 'galkayohospital@gmail.com' : null,
  facilityType: 'Isbitaal',
  hours: OPEN_24H.has(id) ? '24 saac (sida ku qoran liiska dadweynaha)' : 'Saacadaha lama sheegin',
  description: serviceNote || (id === 'galkayo-general' || id === 'wadatal' ? 'Isbitaal guud; faahfaahinta adeegyada lama sheegin.' : 'Adeegyada iyo takhasuska isbitaalka lagama helin faahfaahinta liiska dadweynaha.'),
  verified: false,
  directoryOnly: true,
  verificationStatus: 'public_listing_unverified',
  verificationNote: duplicateNote || NOTE,
  source: 'Isbitaal.com',
  sourceUrl: SOURCE,
}));

function list(query = '') {
  const q = String(query || '').trim().toLowerCase();
  return DIRECTORY.filter(h => !q || [h.name, h.area, h.phone, h.description].join(' ').toLowerCase().includes(q)).map(h => ({ ...h }));
}

module.exports = { list, SOURCE, DIRECTORY };
