'use strict';
// Tiny schema validator. Unknown fields are dropped (mass-assignment protection).
class HttpError extends Error {
  constructor(status, code, fields) { super(code); this.status = status; this.code = code; this.fields = fields; }
}
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;

const v = {
  str: (o = {}) => ({ t: 'str', min: 0, max: 200, ...o }),
  email: (o = {}) => ({ t: 'email', ...o }),
  int: (o = {}) => ({ t: 'int', ...o }),
  bool: (o = {}) => ({ t: 'bool', ...o }),
  enum: (values, o = {}) => ({ t: 'enum', values, ...o }),
  list: (item, o = {}) => ({ t: 'list', item, max: 20, ...o }),
  date: (o = {}) => ({ t: 'date', ...o }),
};

function one(rule, val, name, errors) {
  if (val === undefined || val === null || val === '') {
    if (rule.required) errors[name] = 'required';
    return rule.default !== undefined ? rule.default : undefined;
  }
  switch (rule.t) {
    case 'str': {
      if (typeof val !== 'string') { errors[name] = 'invalid'; return; }
      const s = val.trim().replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
      if (s.length < rule.min) errors[name] = 'too_short';
      else if (s.length > rule.max) errors[name] = 'too_long';
      return s;
    }
    case 'email': {
      const s = String(val).trim().toLowerCase();
      if (!EMAIL.test(s)) errors[name] = 'invalid_email';
      return s;
    }
    case 'int': {
      const n = Number(val);
      if (!Number.isInteger(n)) { errors[name] = 'invalid_number'; return; }
      if (rule.min !== undefined && n < rule.min) errors[name] = 'too_small';
      if (rule.max !== undefined && n > rule.max) errors[name] = 'too_large';
      return n;
    }
    case 'bool': return val === true || val === 'true' || val === 1;
    case 'enum': if (!rule.values.includes(val)) { errors[name] = 'invalid_choice'; return; } return val;
    case 'date': {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(val)) || isNaN(Date.parse(val))) { errors[name] = 'invalid_date'; return; }
      return String(val);
    }
    case 'list': {
      if (!Array.isArray(val)) { errors[name] = 'invalid'; return; }
      if (val.length > rule.max) { errors[name] = 'too_many'; return; }
      return val.map((x, i) => one(rule.item, x, name + '[' + i + ']', errors)).filter(x => x !== undefined && x !== '');
    }
  }
}

function validate(schema, body, { partial = false } = {}) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'invalid_body');
  const errors = {}; const out = {};
  for (const [k, rule] of Object.entries(schema)) {
    if (partial && body[k] === undefined) continue;
    const r = one(rule, body[k], k, errors);
    if (r !== undefined) out[k] = r;
  }
  if (Object.keys(errors).length) throw new HttpError(400, 'validation_failed', errors);
  return out;
}

module.exports = { v, validate, HttpError };
