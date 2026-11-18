'use strict';
// Public listings of travel agencies and airline offices that sell flights to/from Galkacyo.
// Source: each agency's own public website, read on 2026-11-18 (sourceUrl). GURMAD 24 has NOT contacted or verified
// any of them yet: every entry stays verified:false until a written agreement exists and the contact has been confirmed by phone.
// To add or correct an entry, edit this file only. Phone numbers are stored in international format.
const RETRIEVED = '2026-11-18';

const AGENCIES = [
  {
    id: 'galta', name: 'GALTA Air Travel & Logistic Agency', city: 'Galkacyo', address: 'Jubba Airways office, Aaga Daraawiishta, Galkacyo',
    phones: ['+252907782828', '+252904029631', '+252906116752', '+252906797914'], whatsapp: '+252907782828', email: 'galtaairtr@gmail.com',
    services: ['Flight tickets', 'Visa processing', 'Hotel booking', 'Document help'], hours: 'Says it is open day and night',
    sourceUrl: 'https://zhaakircade6-cpu.github.io/GALTA./',
    caution: 'Local office, but its website shows no licence number or company details. Ask for the licence and a written quote before paying.',
  },
  {
    id: 'ibaar', name: 'Ibaar Travel & General Service', city: 'Muqdisho (HQ)', address: 'KM4 Road, opposite Hotel Afrik, Mogadishu',
    phones: ['+252615987122', '+252618862149', '+252618862148', '+252618862147'], whatsapp: '+252615987122', email: 'info@ibaartravel.so',
    services: ['Domestic and international flight tickets', 'Hajj and Umrah', 'Hotel and bus booking'], hours: 'Says customer care is 24/7',
    sourceUrl: 'https://ibaartravel.so/galkacyo/',
    caution: 'Head office is in Mogadishu; its site has a Galkacyo flights page but lists no Galkacyo office. Confirm how they serve Galkacyo.',
  },
  {
    id: 'light', name: 'Light Travel Agency', city: 'Muqdisho (HQ)', address: 'Km4 Junction, Mogadishu',
    phones: ['+2521851388', '+252612496660'], whatsapp: '', email: 'info@lighttravel.so',
    services: ['Domestic flights Mogadishu - Galkacyo', 'Flight tickets'], hours: 'Says support is 24/7',
    sourceUrl: 'https://www.lighttravel.so/our-flights/gaalkacyo/',
    caution: 'Head office is in Mogadishu; no Galkacyo office listed. Confirm before booking.',
  },
];

const list = () => AGENCIES.map(a => ({ ...a, verified: false, directoryOnly: true, retrievedAt: RETRIEVED }));
module.exports = { list, RETRIEVED };
