// backend/routes/voiture.routes.js
const express = require('express');
const router = express.Router();

const voitureController = require('../controllers/voiture.controller');
const factureController = require('../controllers/facture.controller');
const devisController = require('../controllers/devis.controller');

const { verifyToken } = require('../middleware/authMiddleware');

/**
 * Petit wrapper pour éviter le crash si un contrôleur externe
 * (ex: getFacturesParVoiture) n’est pas exporté.
 */
const safe = (fn, name) => (req, res, next) => {
  if (typeof fn === 'function') return fn(req, res, next);
  return res.status(501).json({ error: `Handler ${name} non disponible` });
};

// 🧭 IMPORTANT : routes spécifiques AVANT "/:id"

// 🔹 Voitures d’un client
router.get('/clients/:id', verifyToken, voitureController.getVoituresByClient);

// 🔹 Documents liés à une voiture
router.get('/:id/factures', verifyToken, safe(factureController?.getFacturesParVoiture, 'facture.getFacturesParVoiture'));
router.get('/:id/devis', verifyToken, safe(devisController?.getDevisParVoiture, 'devis.getDevisParVoiture'));

// 🔹 CRUD Voitures
router.post('/', verifyToken, voitureController.createVoiture);
router.get('/:id', verifyToken, voitureController.getVoitureById);
router.put('/:id', verifyToken, voitureController.updateVoiture);
router.delete('/:id', verifyToken, voitureController.deleteVoiture);

// (Optionnel) Lister toutes les voitures (à activer si utile côté front)
// router.get('/', verifyToken, voitureController.getAllVoitures);

module.exports = router;
