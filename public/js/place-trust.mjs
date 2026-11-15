'use strict';

const DIRECTORY_REFERENCE = Object.freeze({
  label: 'Directory reference — not verified',
  badge: 'warn',
  notice: "Public directory or mapping reference. GURMAD 24 has not verified this place's location, contact details, opening hours or operational status. Confirm directly before relying on it.",
  ariaLabel: 'Directory reference, not verified: {name}',
});

const DEMO_SEED = Object.freeze({
  label: 'Demo seed — not a real facility',
  badge: 'warn',
  notice: 'Synthetic demo facility. This is not a real hospital, provider or emergency service. It is not operational and must not be used for care, calls or dispatch.',
  ariaLabel: 'Demo facility, not real or verified: {name}',
});

const VERIFIED_REGISTER = Object.freeze({
  label: 'Verified GURMAD 24 register',
  badge: 'ok',
  notice: 'This organisation is listed in the GURMAD 24 verified facility register.',
  ariaLabel: 'Verified GURMAD 24 facility: {name}',
});

export function placeTrust(place) {
  if (place && place.demo === true) return DEMO_SEED;
  return place && place.reference === true ? DIRECTORY_REFERENCE : VERIFIED_REGISTER;
}
