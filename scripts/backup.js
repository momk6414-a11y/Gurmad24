'use strict';
// Usage: npm run backup   -> copies data/db.json into data/backups/ (keeps the 14 newest)
const path = require('path');
const { Store } = require('../src/store');
const dir = path.resolve(process.env.DATA_DIR || path.join(__dirname, '..', 'data'));
const s = new Store(dir).load();
console.log('Backup created:', s.backup());
