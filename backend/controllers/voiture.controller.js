// backend/controllers/voiture.controller.js
const db = require('../config/db');

/**
 * 🔹 Créer une voiture
 * Body: { immatriculation, kilometrage, client_id }
 */
exports.createVoiture = (req, res) => {
  const { immatriculation = '', kilometrage = 0, client_id } = req.body || {};
  if (!client_id) return res.status(400).json({ error: "client_id requis" });

  try {
    const result = db.prepare(`
      INSERT INTO voitures (immatriculation, kilometrage, client_id)
      VALUES (?, ?, ?)
    `).run(String(immat(immatriculation)), Number(kilometrage) || 0, Number(client_id));

    return res.status(201).json({
      message: '✅ Voiture ajoutée avec succès',
      id: result.lastInsertRowid
    });
  } catch (err) {
    console.error('❌ Erreur createVoiture :', err);
    return res.status(500).json({ error: 'Erreur lors de la création de la voiture', detail: err.message });
  }
};

/**
 * 🔹 Lister les voitures d’un client
 * Params: :id (client_id)
 */
exports.getVoituresByClient = (req, res) => {
  const clientId = Number(req.params.id);
  if (!clientId) return res.status(400).json({ error: 'id client invalide' });

  try {
    const rows = db.prepare(`
      SELECT id, immatriculation, kilometrage, client_id
      FROM voitures
      WHERE client_id = ?
      ORDER BY id DESC
    `).all(clientId);

    return res.json(rows);
  } catch (err) {
    console.error('❌ Erreur getVoituresByClient :', err);
    return res.status(500).json({ error: 'Erreur lors de la récupération des voitures', detail: err.message });
  }
};

/**
 * 🔹 Récupérer une voiture par ID
 * Params: :id (voiture_id)
 */
exports.getVoitureById = (req, res) => {
  const voitureId = Number(req.params.id);
  if (!voitureId) return res.status(400).json({ error: 'id voiture invalide' });

  try {
    const row = db.prepare(`
      SELECT id, immatriculation, kilometrage, client_id
      FROM voitures
      WHERE id = ?
    `).get(voitureId);

    if (!row) return res.status(404).json({ error: 'Voiture non trouvée' });
    return res.json(row);
  } catch (err) {
    console.error('❌ Erreur getVoitureById :', err);
    return res.status(500).json({ error: 'Erreur serveur', detail: err.message });
  }
};

/**
 * 🔹 Mettre à jour une voiture
 * Params: :id
 * Body: { immatriculation?, kilometrage? }
 */
exports.updateVoiture = (req, res) => {
  const voitureId = Number(req.params.id);
  if (!voitureId) return res.status(400).json({ error: 'id voiture invalide' });

  const { immatriculation = '', kilometrage = 0 } = req.body || {};
  try {
    db.prepare(`
      UPDATE voitures
      SET immatriculation = ?, kilometrage = ?
      WHERE id = ?
    `).run(String(immat(immatriculation)), Number(kilometrage) || 0, voitureId);

    return res.json({ message: '✅ Voiture mise à jour avec succès' });
  } catch (err) {
    console.error('❌ Erreur updateVoiture :', err);
    return res.status(500).json({ error: 'Erreur lors de la mise à jour', detail: err.message });
  }
};

/**
 * 🔹 Supprimer une voiture
 * Params: :id
 */
exports.deleteVoiture = (req, res) => {
  const voitureId = Number(req.params.id);
  if (!voitureId) return res.status(400).json({ error: 'id voiture invalide' });

  try {
    db.prepare(`DELETE FROM voitures WHERE id = ?`).run(voitureId);
    return res.json({ message: '✅ Voiture supprimée avec succès' });
  } catch (err) {
    console.error('❌ Erreur deleteVoiture :', err);
    return res.status(500).json({ error: 'Erreur lors de la suppression', detail: err.message });
  }
};

/**
 * (Optionnel) 🔹 Lister toutes les voitures
 */
exports.getAllVoitures = (_req, res) => {
  try {
    const rows = db.prepare(`
      SELECT id, immatriculation, kilometrage, client_id
      FROM voitures
      ORDER BY id DESC
    `).all();
    return res.json(rows);
  } catch (err) {
    console.error('❌ Erreur getAllVoitures :', err);
    return res.status(500).json({ error: 'Erreur lors de la lecture', detail: err.message });
  }
};

/* ---------- Helpers ---------- */
function immat(plate) {
  // petit nettoyage de l’immatriculation (optionnel)
  return String(plate || '').trim().toUpperCase();
}
