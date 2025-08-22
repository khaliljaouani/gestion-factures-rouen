// backend/controllers/statistiques.controller.js
const db = require('../config/db');

const toISO = (s) => (s ? new Date(s).toISOString().slice(0, 10) : null);

/**
 * KPI haut de page
 * - totalEncaisse : somme des factures (hors cachee & impayee)
 * - facturesNormales : nb de factures hors "cachee"
 * - facturesCachees : nb de factures "cachee"
 * - devis : nb total devis
 */
exports.getSummary = (req, res) => {
  try {
    const totalEncaisse = db.prepare(`
      SELECT IFNULL(SUM(montant_ttc),0) AS s
      FROM factures
      WHERE (statut IS NULL OR statut NOT IN ('cachee','impayee'))
    `).get().s;

    const facturesNormales = db.prepare(`
      SELECT COUNT(*) AS c
      FROM factures
      WHERE (statut IS NULL OR statut != 'cachee')
    `).get().c;

    const facturesCachees = db.prepare(`
      SELECT COUNT(*) AS c
      FROM factures
      WHERE statut = 'cachee'
    `).get().c;

    const devis = db.prepare(`
      SELECT COUNT(*) AS c FROM devis
    `).get().c;

    res.json({
      totalEncaisse: Number(totalEncaisse || 0),
      facturesNormales: Number(facturesNormales || 0),
      facturesCachees: Number(facturesCachees || 0),
      devis: Number(devis || 0),
    });
  } catch (e) {
    console.error('getSummary error:', e);
    res.status(500).json({ error: 'Erreur lors du calcul du résumé.' });
  }
};

/**
 * Statistiques par jour et par type
 * Retourne [{ type, date, total, count }]
 * Query: ?start=YYYY-MM-DD&end=YYYY-MM-DD (optionnels)
 */
exports.getDaily = (req, res) => {
  const { start, end } = req.query;

  const devisWhere = [], factWhere = [];
  const p = [];

  if (start) { devisWhere.push(`date(date_devis) >= date(?)`); factWhere.push(`date(date_facture) >= date(?)`); p.push(start); }
  if (end)   { devisWhere.push(`date(date_devis) <= date(?)`); factWhere.push(`date(date_facture) <= date(?)`); p.push(end); }

  const devisClause = devisWhere.length ? `WHERE ${devisWhere.join(' AND ')}` : '';
  const factClause  = factWhere.length ? `WHERE ${factWhere.join(' AND ')}`  : '';

  const sql = `
    SELECT 'devis' AS type, date(date_devis) AS date, IFNULL(SUM(montant_ttc),0) AS total, COUNT(*) AS count
    FROM devis
    ${devisClause}
    GROUP BY date(date_devis)

    UNION ALL

    SELECT 'facture' AS type, date(date_facture) AS date, IFNULL(SUM(montant_ttc),0) AS total, COUNT(*) AS count
    FROM factures
    ${factClause} ${factClause ? 'AND' : 'WHERE'} (statut IS NULL OR statut != 'cachee')
    GROUP BY date(date_facture)

    UNION ALL

    SELECT 'facture_cachee' AS type, date(date_facture) AS date, IFNULL(SUM(montant_ttc),0) AS total, COUNT(*) AS count
    FROM factures
    ${factClause} ${factClause ? 'AND' : 'WHERE'} statut = 'cachee'
    GROUP BY date(date_facture)
  `;

  try {
    const rows = db.prepare(sql).all(...p, ...p, ...p).map(r => ({
      type: String(r.type),
      date: toISO(r.date),
      total: Number(r.total || 0),
      count: Number(r.count || 0),
    }));
    res.json(rows);
  } catch (e) {
    console.error('getDaily error:', e);
    res.status(500).json({ error: 'Erreur stats journalières.' });
  }
};

/**
 * Meilleurs clients par CA (hors cachee)
 * Query: ?limit=5&start=&end=
 */
exports.getTopClients = (req, res) => {
  const limit = Math.max(1, Math.min(50, Number(req.query.limit) || 5));
  const { start, end } = req.query;

  const w = [], p = [];
  if (start) { w.push(`date(f.date_facture) >= date(?)`); p.push(start); }
  if (end)   { w.push(`date(f.date_facture) <= date(?)`); p.push(end); }
  w.push(`(f.statut IS NULL OR f.statut != 'cachee')`);
  const clause = w.length ? `WHERE ${w.join(' AND ')}` : '';

  const sql = `
    SELECT c.nom || ' ' || IFNULL(c.prenom,'') AS nom_complet,
           IFNULL(SUM(f.montant_ttc),0) AS total
    FROM clients c
    JOIN voitures v ON v.client_id = c.id
    JOIN factures f ON f.voiture_id = v.id
    ${clause}
    GROUP BY c.id
    ORDER BY total DESC
    LIMIT ${limit}
  `;

  try {
    const rows = db.prepare(sql).all(...p).map(r => ({
      nom_complet: (r.nom_complet || '').trim() || 'Client',
      total: Number(r.total || 0),
    }));
    res.json(rows);
  } catch (e) {
    console.error('getTopClients error:', e);
    res.status(500).json({ error: 'Erreur meilleurs clients.' });
  }
};

/**
 * Documents d’un jour donné (pour le tableau journalier)
 * Query: ?date=YYYY-MM-DD
 * Retourne [{date, client, type, statut, montant}]
 */
exports.getDocsByDay = (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: "Paramètre 'date' requis (YYYY-MM-DD)" });

  const sql = `
    -- Factures non cachées
    SELECT date(f.date_facture) AS date,
           c.nom || ' ' || IFNULL(c.prenom,'') AS client,
           'facture' AS type,
           IFNULL(f.statut,'payee') AS statut,
           IFNULL(f.montant_ttc,0) AS montant
    FROM factures f
    JOIN voitures v ON v.id = f.voiture_id
    JOIN clients c ON c.id = v.client_id
    WHERE date(f.date_facture) = date(?)
      AND (f.statut IS NULL OR f.statut != 'cachee')

    UNION ALL

    -- Factures cachées
    SELECT date(f.date_facture) AS date,
           c.nom || ' ' || IFNULL(c.prenom,'') AS client,
           'facture_cachee' AS type,
           'cachee' AS statut,
           IFNULL(f.montant_ttc,0) AS montant
    FROM factures f
    JOIN voitures v ON v.id = f.voiture_id
    JOIN clients c ON c.id = v.client_id
    WHERE date(f.date_facture) = date(?)
      AND f.statut = 'cachee'

    UNION ALL

    -- Devis
    SELECT date(d.date_devis) AS date,
           c.nom || ' ' || IFNULL(c.prenom,'') AS client,
           'devis' AS type,
           IFNULL(d.statut,'devis') AS statut,
           IFNULL(d.montant_ttc,0) AS montant
    FROM devis d
    JOIN voitures v ON v.id = d.voiture_id
    JOIN clients c ON c.id = v.client_id
    WHERE date(d.date_devis) = date(?)

    ORDER BY montant DESC
  `;

  try {
    const rows = db.prepare(sql).all(date, date, date).map(r => ({
      date: toISO(r.date),
      client: (r.client || '').trim(),
      type: String(r.type),
      statut: r.statut || (r.type === 'devis' ? 'devis' : 'payee'),
      montant: Number(r.montant || 0),
    }));
    res.json(rows);
  } catch (e) {
    console.error('getDocsByDay error:', e);
    res.status(500).json({ error: 'Erreur documents du jour.' });
  }
};
