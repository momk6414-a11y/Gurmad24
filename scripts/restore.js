'use strict';
// Usage: npm run restore            -> lists backups
//        npm run restore -- <name>  -> restores that backup (current db is saved first as db.before-restore.json)
// Stop the server before restoring.
const fs = require('fs');
const path = require('path');
const dir = path.resolve(process.env.DATA_DIR || path.join(__dirname, '..', 'data'));
const bdir = path.join(dir, 'backups');
const list = fs.existsSync(bdir) ? fs.readdirSync(bdir).filter(f => /^db-.*\.json$/.test(f)).sort().reverse() : [];
const name = process.argv[2];
if (!name) { console.log(list.length ? 'Available backups (newest first):\n ' + list.join('\n ') : 'No backups found.'); process.exit(0); }
if (!list.includes(name)) { console.error('Backup not found:', name); process.exit(1); }
JSON.parse(fs.readFileSync(path.join(bdir, name), 'utf8')); // validate before touching anything
const cur = path.join(dir, 'db.json');
if (fs.existsSync(cur)) fs.copyFileSync(cur, path.join(dir, 'db.before-restore.json'));
fs.copyFileSync(path.join(bdir, name), cur);
console.log('Restored', name, '-> db.json. Start the server again.');
