const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken } = require('../middleware/authMiddleware');

// plus de pad3/pad5

function ensureCountersTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS counters (
      type TEXT PRIMARY KEY,                 -- 'normal' | 'cachee' | 'devis'
      last_number INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_by TEXT
    );
  `);
  db.prepare('INSERT OR IGNORE INTO counters (type, last_number) VALUES (?, ?)').run('normal', 0);
  db.prepare('INSERT OR IGNORE INTO counters (type, last_number) VALUES (?, ?)').run('cachee', 0);
  db.prepare('INSERT OR IGNORE INTO counters (type, last_number) VALUES (?, ?)').run('devis', 0);
}

// GET /api/counters  -> { normal, cachee, devis }
router.get('/', verifyToken, (req, res) => {
  try {
    ensureCountersTable();
    const rows = db.prepare('SELECT type,last_number FROM counters').all();
    const out = rows.reduce((a, r) => (a[r.type] = r.last_number, a), {});
    res.json({ normal: out.normal ?? 0, cachee: out.cachee ?? 0, devis: out.devis ?? 0 });
  } catch (e) {
    console.error('GET /api/counters error:', e);
    res.status(500).json({ error: 'Erreur lecture compteurs' });
  }
});

// GET /api/counters/next -> { nextNormal, nextCachee, nextDevis }
router.get('/next', verifyToken, (req, res) => {
  try {
    ensureCountersTable();
    const get = (t) =>
      db.prepare('SELECT last_number FROM counters WHERE type=?').get(t)?.last_number ?? 0;

    const n = get('normal');
    const c = get('cachee');
    const d = get('devis');

    res.json({
      nextNormal: n + 1,          // 1, 2, 3 ...
      nextCachee: 'C' + (c + 1),  // C1, C2, C3 ...
      nextDevis:  d + 1,          // 1, 2, 3 ...
    });
  } catch (e) {
    console.error('GET /api/counters/next error:', e);
    res.status(500).json({ error: 'Erreur lecture next' });
  }
});

// PUT /api/counters { normal?:number, cachee?:number, devis?:number }
router.put('/', verifyToken, (req, res) => {
  try {
    ensureCountersTable();
    const { normal, cachee, devis } = req.body || {};
    const now = new Date().toISOString();
    const user = req.user?.email || 'admin';
    const tx = db.transaction(() => {
      if (Number.isInteger(normal) && normal >= 0)
        db.prepare(`UPDATE counters SET last_number=?, updated_at=?, updated_by=? WHERE type='normal'`)
          .run(normal, now, user);
      if (Number.isInteger(cachee) && cachee >= 0)
        db.prepare(`UPDATE counters SET last_number=?, updated_at=?, updated_by=? WHERE type='cachee'`)
          .run(cachee, now, user);
      if (Number.isInteger(devis) && devis >= 0)
        db.prepare(`UPDATE counters SET last_number=?, updated_at=?, updated_by=? WHERE type='devis'`)
          .run(devis, now, user);
    });
    tx();
    res.json({ ok: true });
  } catch (e) {
    console.error('PUT /api/counters error:', e);
    res.status(500).json({ error: 'Erreur mise à jour compteurs' });
  }
});

module.exports = router;
