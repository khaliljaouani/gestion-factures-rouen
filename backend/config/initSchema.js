// server.js (extrait)
const db = require('./config/db');

db.exec(`
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS counters (
    type TEXT PRIMARY KEY,               -- 'normal' | 'cachee'
    last_number INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_by TEXT
  );

  INSERT OR IGNORE INTO counters (type, last_number) VALUES ('normal', 0);
  INSERT OR IGNORE INTO counters (type, last_number) VALUES ('cachee', 0);
`);
