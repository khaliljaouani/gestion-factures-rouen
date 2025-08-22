// controllers/facture.controller.js
const db = require('../config/db');
const path = require('path');
const fs = require('fs');
const os = require('os');

const pad3 = (n) => String(n).padStart(3, '0');

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

// 📁 Dossier racine où Electron enregistre les PDF
function pdfBaseDir() {
  // C:\Users\<User>\Documents\gestion-factures\gestion
  return path.join(os.homedir(), 'Documents', 'gestion-factures', 'gestion');
}

// ✅ crée la table counters si besoin + insère les 2 types
function ensureCountersTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS counters (
      type TEXT PRIMARY KEY,
      last_number INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_by TEXT
    );
  `);
  db.prepare('INSERT OR IGNORE INTO counters (type,last_number) VALUES (?,?)').run('normal', 0);
  db.prepare('INSERT OR IGNORE INTO counters (type,last_number) VALUES (?,?)').run('cachee', 0);
}

// ✅ ajoute la colonne created_by à factures si elle n’existe pas
function ensureCreatedByColumn() {
  try {
    const cols = db.prepare(`PRAGMA table_info(factures)`).all();
    const has = cols.some(c => c.name === 'created_by');
    if (!has) {
      db.exec(`ALTER TABLE factures ADD COLUMN created_by TEXT;`);
      console.log('🛠️ Colonne factures.created_by ajoutée');
    }
  } catch (e) {
    console.error('ensureCreatedByColumn error:', e?.message || e);
  }
}

// ✅ Idempotence: ajoute request_id + index unique partiel
function ensureIdempotencyColumn() {
  try {
    const cols = db.prepare(`PRAGMA table_info(factures)`).all();
    if (!cols.some(c => c.name === 'request_id')) {
      db.exec(`ALTER TABLE factures ADD COLUMN request_id TEXT;`);
      console.log('🛠️ Colonne factures.request_id ajoutée');
    }
    db.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_factures_request_id
      ON factures(request_id)
      WHERE request_id IS NOT NULL
    `);
  } catch (e) {
    console.error('ensureIdempotencyColumn error:', e?.message || e);
  }
}

/* ------------------------------------------------------------------ */
/* Handlers                                                           */
/* ------------------------------------------------------------------ */

// POST /api/factures/complete
exports.createFactureComplete = (req, res) => {
  try {
    ensureCountersTable();
    ensureCreatedByColumn();
    ensureIdempotencyColumn(); // ← idempotence

    const { voiture, facture, lignes } = req.body || {};
    if (!voiture || !facture || !Array.isArray(lignes)) {
      return res.status(400).json({ error: 'Payload incomplet (voiture/facture/lignes)' });
    }
    if (lignes.length === 0) {
      return res.status(400).json({ error: 'Aucune ligne fournie' });
    }

    // Clé d’idempotence (même requête -> même facture)
    const requestIdHeader = String(req.get('Idempotency-Key') || '').trim();
    const requestIdBody = String(req.body?.request_id || '').trim();
    const requestId = requestIdHeader || requestIdBody || null;

    // Si déjà traitée, renvoyer la même facture immédiatement
    if (requestId) {
      const existing = db.prepare(
        `SELECT id, numero FROM factures WHERE request_id = ?`
      ).get(requestId);
      if (existing) {
        return res.json({ numero: existing.numero, factureId: existing.id, duplicate: true });
      }
    }

    const type = (facture.statut === 'cachee') ? 'cachee' : 'normal';
    const prefix = type === 'cachee' ? 'C' : '';
    const dateFacture = (facture.date_facture && String(facture.date_facture)) || new Date().toISOString().slice(0,10);

    const immat = (voiture.immatriculation || '').trim();
    const clientId = (voiture.client_id === '' || voiture.client_id === undefined || voiture.client_id === null)
      ? null : Number(voiture.client_id);

    const montantTTC = Number(facture.montant_ttc) || 0;
    const remise = Number(facture.remise) || 0;

    // 👤 Qui a créé ? (injecté par verifyToken → req.user)
    const createdBy = req.user
      ? ((`${req.user?.prenom ?? ''} ${req.user?.nom ?? ''}`.trim()) || req.user?.email || 'Admin')
      : 'Admin';

    const result = db.transaction(() => {
      // 1) Compteur
      const row = db.prepare('SELECT last_number FROM counters WHERE type = ?').get(type);
      const next = (row?.last_number ?? 0) + 1;
      const numero = `${prefix}${pad3(next)}`;

      // 2) Voiture (upsert simple)
      let voitureId;
      if (immat !== '' && clientId !== null) {
        const existing = db.prepare('SELECT id FROM voitures WHERE immatriculation=? AND client_id=?').get(immat, clientId);
        if (existing?.id) {
          db.prepare('UPDATE voitures SET kilometrage=? WHERE id=?').run(Number(voiture.kilometrage) || 0, existing.id);
          voitureId = existing.id;
        } else {
          voitureId = db.prepare(`
            INSERT INTO voitures (immatriculation, kilometrage, client_id)
            VALUES (?, ?, ?)
            RETURNING id
          `).get(immat, Number(voiture.kilometrage) || 0, clientId).id;
        }
      } else {
        // on insère tout de même pour garder la relation
        voitureId = db.prepare(`
          INSERT INTO voitures (immatriculation, kilometrage, client_id)
          VALUES (?, ?, ?)
          RETURNING id
        `).get(immat, Number(voiture.kilometrage) || 0, clientId).id;
      }

      // 3) Facture (➡️ created_by + request_id)
      const factureId = db.prepare(`
        INSERT INTO factures (numero, date_facture, montant_ttc, remise, statut, voiture_id, created_by, request_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        RETURNING id
      `).get(
        numero, dateFacture, montantTTC, remise,
        (type === 'cachee') ? 'cachee' : 'normale',
        voitureId,
        createdBy,
        requestId // peut être NULL (pas d’idempotence si front ne l’envoie pas)
      ).id;

      // 4) Lignes
      const insL = db.prepare(`
        INSERT INTO facture_lignes
        (facture_id, reference, description, quantite, prix_unitaire, tva, total_ht)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      for (const l of lignes) {
        insL.run(
          factureId,
          (l?.reference || '').trim(),
          (l?.description || '').trim(),
          Number(l?.quantite) || 0,
          Number(l?.prix_unitaire) || 0,
          Number(l?.tva) || 0,
          Number(l?.total_ht) || 0
        );
      }

      // 5) Incrément le compteur
      db.prepare(`UPDATE counters SET last_number=?, updated_at=datetime('now') WHERE type=?`).run(next, type);

      return { numero, factureId };
    })();

    return res.json(result);
  } catch (err) {
    // Gestion d’un éventuel conflit de clé unique (request_id)
    if (String(err?.message || '').includes('idx_factures_request_id')) {
      try {
        const rid = String(req.get('Idempotency-Key') || req.body?.request_id || '').trim();
        if (rid) {
          const existing = db.prepare(`SELECT id, numero FROM factures WHERE request_id = ?`).get(rid);
          if (existing) {
            return res.json({ numero: existing.numero, factureId: existing.id, duplicate: true });
          }
        }
      } catch (_) {}
    }
    console.error('❌ createFactureComplete error:', err?.message || err);
    return res.status(500).json({ error: 'Enregistrement échoué', detail: err?.message || String(err) });
  }
};

// GET /api/factures/:id (en-tête)
exports.getFactureById = (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'id invalide' });

    const row = db.prepare(`
      SELECT id, numero, date_facture, montant_ttc, remise, statut, voiture_id, created_by
      FROM factures WHERE id = ?
    `).get(id);

    if (!row) return res.status(404).json({ error: 'Facture introuvable' });
    res.json(row);
  } catch (e) {
    console.error('getFactureById error:', e?.message || e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// GET /api/factures/:id/lignes
exports.getLignesByFacture = (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'id invalide' });
    const rows = db.prepare(`
      SELECT id, reference, description, quantite, prix_unitaire, tva, total_ht
      FROM facture_lignes WHERE facture_id = ?
    `).all(id);
    res.json(rows);
  } catch (e) {
    console.error('getLignesByFacture error:', e?.message || e);
    res.status(500).json({ error: 'Erreur lecture lignes' });
  }
};

// GET /api/factures
exports.getAllFactures = (_req, res) => {
  try {
    ensureCreatedByColumn();

    const rows = db.prepare(`
      SELECT
        f.id,
        f.numero,
        f.date_facture,
        f.montant_ttc,
        f.remise,
        f.statut,
        f.created_by,
        v.immatriculation,
        c.nom || ' ' || c.prenom AS client
      FROM factures f
      LEFT JOIN voitures v ON v.id = f.voiture_id
      LEFT JOIN clients c ON c.id = v.client_id
      ORDER BY f.id DESC
    `).all();

    res.json(rows);
  } catch (e) {
    console.error('Erreur getAllFactures:', e?.message || e);
    res.status(500).json({ error: 'Erreur lecture factures' });
  }
};

// GET /api/voitures/:id/factures
exports.getFacturesParVoiture = (req, res) => {
  try {
    const voitureId = Number(req.params.id);
    if (!voitureId) return res.status(400).json({ error: 'id voiture invalide' });

    const rows = db.prepare(`
      SELECT f.id, f.numero, f.date_facture, f.montant_ttc, f.remise, f.statut
      FROM factures f
      WHERE f.voiture_id = ?
      ORDER BY f.id DESC
    `).all(voitureId);

    res.json(rows);
  } catch (e) {
    console.error('getFacturesParVoiture error:', e?.message || e);
    res.status(500).json({ error: 'Erreur lecture factures par voiture' });
  }
};

/* ---------------------- PDF: servir & régénérer -------------------- */

// GET /api/factures/:id/pdf
exports.getFacturePdf = (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'id invalide' });

    const row = db.prepare(`SELECT numero, statut FROM factures WHERE id = ?`).get(id);
    if (!row) return res.status(404).json({ error: 'Facture introuvable' });

    const subFolder = row.statut === 'cachee'
      ? path.join('factures', 'facture-cachee')
      : 'factures';

    const fileName = `facture_${row.numero}.pdf`;
    const filePath = path.join(pdfBaseDir(), subFolder, fileName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).send(`PDF introuvable : ${fileName}`);
    }
    res.sendFile(filePath);
  } catch (e) {
    console.error('getFacturePdf error:', e?.message || e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// POST /api/factures/:id/pdf/regenerate  (stub 204)
exports.regenerateFacturePdf = (_req, res) => {
  // Si tu veux déclencher une (ré)impression côté Electron depuis le backend,
  // il faudra faire un pont IPC (non inclus ici). On répond 204 pour le front.
  res.status(204).end();
};
