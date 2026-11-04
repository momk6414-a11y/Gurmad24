'use strict';
// Persistent JSON document store with atomic writes, versioned migrations and backups.
// Suitable for a pilot (single server instance). For multi-server scale, replace this module
// with PostgreSQL behind the same small interface (see docs/ARCHITECTURE.md).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const COLLECTIONS = ['users', 'sessions', 'orgs', 'cards', 'orders', 'appointments', 'cases', 'services',
  'subscriptions', 'plans', 'transactions', 'invoices', 'complaints', 'audit', 'sponsored'];

class Store {
  constructor(dir) {
    this.dir = dir;
    this.file = path.join(dir, 'db.json');
    this.backupDir = path.join(dir, 'backups');
    this.data = null;
    this._timer = null;
    this._counters = {};
  }

  load() {
    fs.mkdirSync(this.dir, { recursive: true });
    if (fs.existsSync(this.file)) {
      try { this.data = JSON.parse(fs.readFileSync(this.file, 'utf8')); }
      catch (e) {
        // Corrupt main file: try the newest backup instead of silently starting empty.
        const b = this.listBackups()[0];
        if (!b) throw new Error('Database file is corrupt and no backup exists: ' + e.message);
        console.error('[store] db.json corrupt, restoring newest backup', b);
        this.data = JSON.parse(fs.readFileSync(path.join(this.backupDir, b), 'utf8'));
      }
    } else {
      this.data = { meta: { version: 0, createdAt: new Date().toISOString() }, settings: {} };
    }
    for (const c of COLLECTIONS) if (!this.data[c]) this.data[c] = [];
    return this;
  }

  // ---- generic helpers
  col(name) { return this.data[name]; }
  id(prefix) { return prefix + crypto.randomBytes(8).toString('hex'); }
  find(name, pred) { return this.data[name].find(pred); }
  get(name, id) { return this.data[name].find(x => x.id === id); }
  filter(name, pred) { return this.data[name].filter(pred); }
  insert(name, doc) { this.data[name].push(doc); this.save(); return doc; }
  remove(name, id) { const a = this.data[name]; const i = a.findIndex(x => x.id === id); if (i >= 0) a.splice(i, 1); this.save(); return i >= 0; }
  next(counter) { // human-friendly sequential numbers (receipts, invoices, cases)
    const m = this.data.meta; m.counters = m.counters || {};
    m.counters[counter] = (m.counters[counter] || 0) + 1; this.save(); return m.counters[counter];
  }

  // ---- persistence (debounced + atomic)
  save() { if (this._timer) return; this._timer = setTimeout(() => { this._timer = null; this.flush(); }, 40); if (this._timer.unref) this._timer.unref(); }
  flush() {
    if (this._timer) { clearTimeout(this._timer); this._timer = null; }
    const tmp = this.file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(this.data), { mode: 0o600 });
    fs.renameSync(tmp, this.file); // atomic replace
  }

  // ---- backups
  listBackups() {
    try { return fs.readdirSync(this.backupDir).filter(f => /^db-.*\.json$/.test(f)).sort().reverse(); } catch (_) { return []; }
  }
  backup(keep = 14) {
    this.flush();
    fs.mkdirSync(this.backupDir, { recursive: true });
    const name = 'db-' + new Date().toISOString().replace(/[:.]/g, '-') + '.json';
    fs.copyFileSync(this.file, path.join(this.backupDir, name));
    for (const old of this.listBackups().slice(keep)) fs.unlinkSync(path.join(this.backupDir, old));
    return name;
  }

  // ---- migrations
  migrate(migrations) {
    const sorted = [...migrations].sort((a, b) => a.id - b.id);
    let applied = 0;
    for (const m of sorted) {
      if (m.id > (this.data.meta.version || 0)) {
        m.up(this.data);
        this.data.meta.version = m.id;
        this.data.meta.migrations = (this.data.meta.migrations || []).concat({ id: m.id, name: m.name, at: new Date().toISOString() });
        applied++;
      }
    }
    if (applied) this.flush();
    return applied;
  }
}

module.exports = { Store, COLLECTIONS };
