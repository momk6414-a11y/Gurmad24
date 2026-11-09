'use strict';
// Supabase Postgres adapter. The application keeps its existing synchronous Store API;
// each request commits a complete, ordered snapshot through two locked-down RPCs.
const { Store, COLLECTIONS } = require('./store');

class SupabaseStore extends Store {
  constructor(dir, options = {}) {
    super(dir);
    this.backend = 'supabase-postgres';
    this.url = String(options.url || '').replace(/\/$/, '');
    this.key = options.serviceRoleKey || '';
    this.ready = false;
    this.dirty = false;
    this._writeChain = Promise.resolve();
  }

  async connect() {
    if (!this.url || !this.key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
    const response = await this._rpc('gurmad24_store_load', {});
    if (!response || typeof response !== 'object' || !response.collections) {
      throw new Error('Supabase returned an invalid GURMAD 24 database snapshot');
    }
    this.data = { meta: response.meta || { version: 0 }, settings: response.settings || {} };
    for (const name of COLLECTIONS) {
      const rows = response.collections[name];
      this.data[name] = Array.isArray(rows) ? rows : [];
    }
    this.ready = true;
    return this;
  }

  async _rpc(name, body) {
    const response = await fetch(this.url + '/rest/v1/rpc/' + name, {
      method: 'POST',
      headers: {
        apikey: this.key,
        Authorization: 'Bearer ' + this.key,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 500);
      throw new Error('Supabase ' + name + ' failed (' + response.status + '): ' + detail);
    }
    return response.json();
  }

  save() {
    this.dirty = true;
    if (this._timer) return;
    this._timer = setTimeout(() => {
      this._timer = null;
      this.flush().catch(e => console.error('[supabase-store] background commit failed:', e.message));
    }, 40);
    if (this._timer.unref) this._timer.unref();
  }

  flush() {
    if (this._timer) { clearTimeout(this._timer); this._timer = null; }
    if (!this.ready || !this.dirty) return this._writeChain;
    this.dirty = false;
    const snapshot = {
      meta: this.data.meta || {},
      settings: this.data.settings || {},
      collections: Object.fromEntries(COLLECTIONS.map(name => [name, this.data[name] || []])),
    };
    const task = this._writeChain.then(() => this._rpc('gurmad24_store_replace', { p_snapshot: snapshot }));
    this._writeChain = task.catch(error => {
      this.dirty = true;
      console.error('[supabase-store] commit failed:', error.message);
    });
    return task;
  }

  listBackups() { return []; }
  backup() {
    throw new Error('Local JSON backups are disabled for Supabase storage; configure an independent encrypted backup destination.');
  }

  async close() {
    await this.flush();
    this.ready = false;
  }
}

module.exports = { SupabaseStore };
