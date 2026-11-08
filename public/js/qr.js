// Minimal QR Code generator (byte mode, error correction M, versions 1-6 = up to 106 bytes). No dependencies.
// Returns a square boolean matrix (true = dark). Follows ISO/IEC 18004; the layout follows the well-known reference algorithm.

const VERS = { // [ec codewords per block, [[blocks, data codewords per block]]]
  1: [10, [[1, 16]]], 2: [16, [[1, 28]]], 3: [26, [[1, 44]]], 4: [18, [[2, 32]]], 5: [24, [[2, 43]]], 6: [16, [[4, 27]]],
};
const ALIGN = { 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30], 6: [6, 34] };

const EXP = new Uint8Array(512), LOG = new Uint8Array(256);
for (let i = 0, x = 1; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 256) x ^= 0x11d; }
for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
const mul = (a, b) => (a && b ? EXP[LOG[a] + LOG[b]] : 0);

function rsGenerator(deg) {
  let p = [1];
  for (let i = 0; i < deg; i++) { const n = new Array(p.length + 1).fill(0); for (let j = 0; j < p.length; j++) { n[j] ^= p[j]; n[j + 1] ^= mul(p[j], EXP[i]); } p = n; }
  return p;
}
function rsRemainder(data, deg) {
  const gen = rsGenerator(deg); const r = new Array(deg).fill(0);
  for (const b of data) { const f = b ^ r.shift(); r.push(0); for (let i = 0; i < deg; i++) r[i] ^= mul(gen[i + 1], f); }
  return r;
}

function encodeData(bytes, version) {
  const [ecPer, groups] = VERS[version]; const cap = groups.reduce((a, [n, d]) => a + n * d, 0);
  const bits = []; const put = (v, len) => { for (let i = len - 1; i >= 0; i--) bits.push((v >>> i) & 1); };
  put(0b0100, 4); put(bytes.length, 8); bytes.forEach(b => put(b, 8));
  put(0, Math.min(4, cap * 8 - bits.length)); while (bits.length % 8) bits.push(0);
  const cw = []; for (let i = 0; i < bits.length; i += 8) cw.push(parseInt(bits.slice(i, i + 8).join(''), 2));
  for (let pad = 0xec; cw.length < cap; pad ^= 0xec ^ 0x11) cw.push(pad);
  // split into blocks, add error correction, interleave
  const blocks = []; let k = 0;
  for (const [n, d] of groups) for (let i = 0; i < n; i++) { const data = cw.slice(k, k + d); k += d; blocks.push({ data, ec: rsRemainder(data, ecPer) }); }
  const out = []; const maxD = Math.max(...blocks.map(b => b.data.length));
  for (let i = 0; i < maxD; i++) blocks.forEach(b => { if (i < b.data.length) out.push(b.data[i]); });
  for (let i = 0; i < ecPer; i++) blocks.forEach(b => out.push(b.ec[i]));
  return out;
}

const MASKS = [(r, c) => (r + c) % 2 === 0, (r) => r % 2 === 0, (r, c) => c % 3 === 0, (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0, (r, c) => (r * c) % 2 + (r * c) % 3 === 0,
  (r, c) => ((r * c) % 2 + (r * c) % 3) % 2 === 0, (r, c) => ((r + c) % 2 + (r * c) % 3) % 2 === 0];

function penalty(m) {
  const n = m.length; let p = 0;
  const lines = []; for (let i = 0; i < n; i++) { lines.push(m[i].map(Number).join('')); lines.push(m.map(r => +r[i]).join('')); }
  for (const l of lines) { const runs = l.match(/0+|1+/g); for (const r of runs) if (r.length >= 5) p += 3 + r.length - 5; p += 40 * ((l.match(/(?=10111010000|00001011101)/g) || []).length); }
  for (let r = 0; r < n - 1; r++) for (let c = 0; c < n - 1; c++) if (m[r][c] === m[r][c + 1] && m[r][c] === m[r + 1][c] && m[r][c] === m[r + 1][c + 1]) p += 3;
  let dark = 0; m.forEach(r => r.forEach(v => { if (v) dark++; }));
  p += 10 * (Math.ceil(Math.abs(dark * 20 - n * n * 10) / (n * n)) - 1);
  return p;
}

export function qrMatrix(text) {
  const bytes = [...new TextEncoder().encode(text)];
  let version = 0; for (let v = 1; v <= 6; v++) { const cap = VERS[v][1].reduce((a, [n, d]) => a + n * d, 0); if (bytes.length + 2 <= cap) { version = v; break; } }
  if (!version) throw new Error('qr_too_long');
  const size = 17 + 4 * version; const m = Array.from({ length: size }, () => new Array(size).fill(false)); const res = Array.from({ length: size }, () => new Array(size).fill(false));
  const setF = (r, c, v) => { m[r][c] = !!v; res[r][c] = true; };
  const finder = (r0, c0) => { for (let dr = -1; dr <= 7; dr++) for (let dc = -1; dc <= 7; dc++) { const r = r0 + dr, c = c0 + dc; if (r < 0 || c < 0 || r >= size || c >= size) continue;
    const inside = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6; setF(r, c, inside && (dr === 0 || dr === 6 || dc === 0 || dc === 6 || (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4))); } };
  finder(0, 0); finder(0, size - 7); finder(size - 7, 0);
  for (let i = 8; i < size - 8; i++) { setF(6, i, i % 2 === 0); setF(i, 6, i % 2 === 0); }
  if (ALIGN[version]) { const a = ALIGN[version]; for (const r of a) for (const c of a) { if ((r === 6 && c === 6) || (r === 6 && c === a[1] && false)) continue; if (res[r][c]) continue;
    for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) setF(r + dr, c + dc, Math.max(Math.abs(dr), Math.abs(dc)) !== 1); } }
  // reserve format areas
  for (let i = 0; i < 9; i++) { if (!res[8][i]) setF(8, i, false); if (!res[i][8]) setF(i, 8, false); }
  for (let i = 0; i < 8; i++) { if (!res[8][size - 1 - i]) setF(8, size - 1 - i, false); if (!res[size - 1 - i][8]) setF(size - 1 - i, 8, false); }
  setF(size - 8, 8, true);
  // place data
  const cw = encodeData(bytes, version); const bits = []; cw.forEach(b => { for (let i = 7; i >= 0; i--) bits.push((b >> i) & 1); });
  let bi = 0, up = true;
  for (let col = size - 1; col > 0; col -= 2) { if (col === 6) col--;
    for (let i = 0; i < size; i++) { const row = up ? size - 1 - i : i; for (let dx = 0; dx < 2; dx++) { const c = col - dx; if (!res[row][c]) m[row][c] = bi < bits.length ? bits[bi++] === 1 : false; } } up = !up; }
  // choose the best mask
  let best = null;
  for (let mask = 0; mask < 8; mask++) {
    const t = m.map(r => r.slice());
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (!res[r][c] && MASKS[mask](r, c)) t[r][c] = !t[r][c];
    const data = (0 << 3) | mask; let rem = data << 10; for (let i = 14; i >= 10; i--) if ((rem >> i) & 1) rem ^= 0x537 << (i - 10);
    const fb = ((data << 10) | rem) ^ 0x5412; const bit = i => ((fb >> i) & 1) === 1;
    for (let i = 0; i <= 5; i++) t[i][8] = bit(i); t[7][8] = bit(6); t[8][8] = bit(7); t[8][7] = bit(8); for (let i = 9; i < 15; i++) t[8][14 - i] = bit(i);
    for (let i = 0; i < 8; i++) t[8][size - 1 - i] = bit(i); for (let i = 8; i < 15; i++) t[size - 15 + i][8] = bit(i);
    t[size - 8][8] = true;
    const sc = penalty(t); if (!best || sc < best.sc) best = { sc, t };
  }
  return best.t;
}

// SVG path (1 unit per module) with a 4-module quiet zone.
export function qrPath(text) {
  const m = qrMatrix(text); const q = 4; let d = '';
  m.forEach((row, r) => { let c = 0; while (c < row.length) { if (row[c]) { let e = c; while (e < row.length && row[e]) e++; d += `M${c + q} ${r + q}h${e - c}v1h-${e - c}z`; c = e; } else c++; } });
  return { d, size: m.length + 2 * q };
}
