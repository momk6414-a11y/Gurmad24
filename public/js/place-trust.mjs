'use strict';

const DIRECTORY_REFERENCE = Object.freeze({
  label: 'Directory reference — not verified',
  badge: 'warn',
  notice: "Public directory or mapping reference. GURMAD 24 has not verified this place's location, contact details, opening hours or operational status. Confirm directly before relying on it.",
  ariaLabel: 'Directory reference, not verified: {name}',
});

const VERIFIED_REGISTER = Object.freeze({
  label: 'Verified GURMAD 24 register',
  badge: 'ok',
  notice: 'This organisation is listed in the GURMAD 24 verified facility register.',
  ariaLabel: 'Verified GURMAD 24 facility: {name}',
});

export function placeTrust(place) {
  return place && place.reference === true ? DIRECTORY_REFERENCE : VERIFIED_REGISTER;
}
