// backend/controllers/devis.controller.js
const db = require('../config/db');
const path = require('path');
const fs = require('fs');
const os = require('os');

const pad5 = (n) => String(n).padStart(5, '0');

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

// C:\Users\<User>\Documents\gestion-factures\gestion
function pdfBaseDir() {
  return path.join(os.homedir(), 'Documents', 'gestion-factures', 'gestion');
}

function ensureDevisCounter() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS counters (
      type TEXT PRIMARY KEY,
      last_number INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_by TEXT
    );
  `);
  db.prepare(`INSERT OR IGNORE INTO counters (type, last_number) VALUES ('devis', 0)`).run();
}

function ensureDevisCreatedByColumn() {
  try {
    const cols = db.prepare(`PRAGMA table_info(devis)`).all();
    if (!cols.some(c => c.name === 'created_by')) {
      db.exec(`ALTER TABLE devis ADD COLUMN created_by TEXT;`);
      console.log('🛠️ Colonne devis.created_by ajoutée');
    }
  } catch (e) {
    console.error('ensureDevisCreatedByColumn error:', e?.message || e);
  }
}

const cleanImmat = (plate) => String(plate || '').trim().toUpperCase();

/* ------------------------------------------------------------------ */
/* Handlers CRUD                                                      */
/* ------------------------------------------------------------------ */

// POST /api/devis/complete
exports.createDevisComplet = (req, res) => {
  const {
    client_id,
    immatriculation = '',
    kilometrage = 0,
    date_devis,
    montant_ttc = 0,
    statut = 'normal',
    lignes = [],
  } = req.body || {};

  if (!client_id) return res.status(400).json({ error: 'client_id manquant' });
  if (!Array.isArray(lignes) || lignes.length === 0) {
    return res.status(400).json({ error: 'Aucune ligne à enregistrer' });
  }

  try {
    ensureDevisCounter();
    ensureDevisCreatedByColumn();

    const createdBy = req.user
      ? (`${req.user?.prenom ?? ''} ${req.user?.nom ?? ''}`.trim() || req.user?.email || 'Admin')
      : 'Admin';

    const result = db.transaction(() => {
      // 1) Prochain numéro
      const row = db.prepare(`SELECT last_number FROM counters WHERE type='devis'`).get();
      const next = (row?.last_number ?? 0) + 1;
      const numero = pad5(next);

      // 2) Upsert voiture
      const clientIdNum = Number(client_id) || null;
      const immat = cleanImmat(immatriculation);

      let voitureId;
      if (immat !== '' && clientIdNum !== null) {
        const ex = db.prepare(`SELECT id FROM voitures WHERE immatriculation=? AND client_id=?`)
          .get(immat, clientIdNum);
        if (ex?.id) {
          db.prepare(`UPDATE voitures SET kilometrage=? WHERE id=?`)
            .run(Number(kilometrage) || 0, ex.id);
          voitureId = ex.id;
        } else {
          voitureId = db.prepare(`
            INSERT INTO voitures (immatriculation, kilometrage, client_id)
            VALUES (?, ?, ?)
            RETURNING id
          `).get(immat, Number(kilometrage) || 0, clientIdNum).id;
        }
      } else {
        voitureId = db.prepare(`
          INSERT INTO voitures (immatriculation, kilometrage, client_id)
          VALUES (?, ?, ?)
          RETURNING id
        `).get(immat, Number(kilometrage) || 0, clientIdNum).id;
      }

      // 3) Insertion devis (+ created_by)
      const devisId = db.prepare(`
        INSERT INTO devis (numero, date_devis, montant_ttc, statut, voiture_id, created_by)
        VALUES (?, ?, ?, ?, ?, ?)
        RETURNING id
      `).get(
        numero,
        (date_devis && String(date_devis)) || new Date().toISOString().slice(0,10),
        Number(montant_ttc) || 0,
        statut,
        voitureId,
        createdBy
      ).id;

      // 4) Lignes
      const insL = db.prepare(`
        INSERT INTO devis_lignes
        (devis_id, reference, description, quantite, prix_unitaire, remise, tva, total_ht)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const l of lignes) {
        insL.run(
          devisId,
          (l?.reference || '').trim(),
          (l?.description || '').trim(),
          Number(l?.quantite) || 0,
          Number(l?.prix_unitaire) || 0,
          Number(l?.remise) || 0,
          Number(l?.tva) || 0,
          Number(l?.total_ht) || 0
        );
      }

      // 5) Compteur -> commit
      db.prepare(`UPDATE counters SET last_number=?, updated_at=datetime('now') WHERE type='devis'`)
        .run(next);

      return { devisId, numero };
    })();

    return res.status(201).json({
      message: '✅ Devis enregistré avec succès',
      devis_id: result.devisId,
      numero: result.numero
    });

  } catch (err) {
    console.error('❌ createDevisComplet error:', err);
    return res.status(500).json({ error: 'Erreur serveur', detail: err.message });
  }
};

// GET /api/devis
exports.getAllDevis = (_req, res) => {
  try {
    const rows = db.prepare(`
      SELECT 
        d.id,
        d.numero,
        d.date_devis,
        d.montant_ttc,
        d.statut,
        d.created_by,
        v.immatriculation,
        c.nom || ' ' || c.prenom AS client
      FROM devis d
      LEFT JOIN voitures v ON v.id = d.voiture_id
      LEFT JOIN clients c ON c.id = v.client_id
      ORDER BY d.id DESC
    `).all();
  res.json(rows);
  } catch (err) {
    console.error('❌ getAllDevis error:', err);
    res.status(500).json({ error: 'Erreur lecture devis', detail: err.message });
  }
};

// GET /api/devis/voitures/:id
exports.getDevisParVoiture = (req, res) => {
  const voitureId = Number(req.params.id);
  if (!voitureId) return res.status(400).json({ error: 'id voiture invalide' });

  try {
    const rows = db.prepare(`
      SELECT d.id, d.numero, d.date_devis, d.montant_ttc, d.statut
      FROM devis d
      WHERE d.voiture_id = ?
      ORDER BY d.id DESC
    `).all(voitureId);
    res.json(rows);
  } catch (err) {
    console.error('❌ getDevisParVoiture error:', err);
    res.status(500).json({ error: 'Erreur serveur', detail: err.message });
  }
};

// GET /api/devis/:id/lignes
exports.getLignesByDevis = (req, res) => {
  const devisId = Number(req.params.id);
  if (!devisId) return res.status(400).json({ error: 'id devis invalide' });

  try {
    const rows = db.prepare(`
      SELECT id, reference, description, quantite, prix_unitaire, remise, tva, total_ht
      FROM devis_lignes
      WHERE devis_id = ?
      ORDER BY id ASC
    `).all(devisId);
    res.json(rows);
  } catch (err) {
    console.error('❌ getLignesByDevis error:', err);
    res.status(500).json({ error: 'Erreur serveur', detail: err.message });
  }
};

// GET /api/devis/:id (header utilisé par la page détails)
exports.getDevisById = (req, res) => {
  const devisId = Number(req.params.id);
  if (!devisId) return res.status(400).json({ error: 'id devis invalide' });
  try {
    const row = db.prepare(`
      SELECT d.id, d.numero, d.date_devis, d.montant_ttc, d.statut, d.created_by,
             v.immatriculation, v.kilometrage,
             c.nom, c.prenom
      FROM devis d
      LEFT JOIN voitures v ON v.id = d.voiture_id
      LEFT JOIN clients c ON c.id = v.client_id
      WHERE d.id = ?
    `).get(devisId);

    if (!row) return res.status(404).json({ error: 'Devis introuvable' });
    res.json(row);
  } catch (err) {
    console.error('❌ getDevisById error:', err);
    res.status(500).json({ error: 'Erreur serveur', detail: err.message });
  }
};

/* ---------------------- PDF: servir & régénérer -------------------- */

// GET /api/devis/:id/pdf  -> sert le PDF généré par Electron (même logique que factures)
exports.getDevisPdf = (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'id devis invalide' });

    const row = db.prepare(`SELECT numero FROM devis WHERE id = ?`).get(id);
    if (!row) return res.status(404).json({ error: 'Devis introuvable' });

    const subFolder = 'devis'; // pas de notion "cachee" ici, adapter si besoin
    const fileName = `devis_${row.numero}.pdf`;
    const filePath = path.join(pdfBaseDir(), subFolder, fileName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).send(`PDF introuvable : ${fileName}`);
    }
    res.sendFile(filePath);
  } catch (e) {
    console.error('getDevisPdf error:', e?.message || e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// POST /api/devis/:id/pdf/regenerate -> stub 204 (comme factures)
exports.regenerateDevisPdf = (_req, res) => {
  // Si tu veux déclencher une (ré)génération via Electron, il faudra un pont IPC.
  // Ici on reste symétrique avec les factures : 204 pour informer le front.
  res.status(204).end();
};
