// controllers/counter.controller.js
const db = require('../config/db');

// 🔹 Obtenir les compteurs actuels
exports.getCounters = (req, res) => {
  try {
    const rows = db.prepare(`SELECT type, last_number FROM counters`).all();
    const normal = rows.find(r => r.type === 'normal')?.last_number || 0;
    const cachee = rows.find(r => r.type === 'cachee')?.last_number || 0;
    res.json({ normal, cachee });
  } catch (err) {
    console.error("❌ Erreur getCounters :", err);
    res.status(500).json({ error: 'Erreur récupération compteurs' });
  }
};

// 🔹 Obtenir le prochain numéro (sans zéro-padding)
exports.getNextNumbers = (req, res) => {
  try {
    const rows = db.prepare(`SELECT type, last_number FROM counters`).all();
    const nextNormal = (rows.find(r => r.type === 'normal')?.last_number || 0) + 1;
    const nextCachee = "C" + ((rows.find(r => r.type === 'cachee')?.last_number || 0) + 1);
    res.json({ nextNormal, nextCachee });
  } catch (err) {
    console.error("❌ Erreur getNextNumbers :", err);
    res.status(500).json({ error: 'Erreur récupération prochains numéros' });
  }
};

// 🔹 Mettre à jour les compteurs
exports.updateCounters = (req, res) => {
  try {
    const { normal, cachee } = req.body;
    if (typeof normal !== 'number' || typeof cachee !== 'number') {
      return res.status(400).json({ error: 'Valeurs invalides' });
    }
    db.prepare(`UPDATE counters SET last_number = ?, updated_at = datetime('now') WHERE type = 'normal'`).run(normal);
    db.prepare(`UPDATE counters SET last_number = ?, updated_at = datetime('now') WHERE type = 'cachee'`).run(cachee);
    res.json({ message: '✅ Compteurs mis à jour' });
  } catch (err) {
    console.error("❌ Erreur updateCounters :", err);
    res.status(500).json({ error: 'Erreur mise à jour compteurs' });
  }
};
