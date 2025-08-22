// backend/routes/devis.routes.js
const express = require('express');
const router = express.Router();
const devisController = require('../controllers/devis.controller');
const { verifyToken } = require('../middleware/authMiddleware');

// Petit “safe wrapper” pour éviter qu’Express ne plante si une fonction dctlr est absente
const safe = (fn, name) => (req, res, next) => {
  if (typeof fn === 'function') return fn(req, res, next);
  return res.status(501).json({ error: `Handler ${name} non disponible` });
};

// ====================== ROUTES DEVIS ======================

// 🔹 Créer un devis complet (numéro attribué côté serveur)
router.post(
  '/complete',
  verifyToken,
  safe(devisController.createDevisComplet, 'createDevisComplet')
);

// 🔹 Obtenir tous les devis
router.get(
  '/',
  verifyToken,
  safe(devisController.getAllDevis, 'getAllDevis')
);

// 🔹 Obtenir les devis d’une voiture
router.get(
  '/voitures/:id',
  verifyToken,
  safe(devisController.getDevisParVoiture, 'getDevisParVoiture')
);

// 🔹 Lignes d’un devis
router.get(
  '/:id/lignes',
  verifyToken,
  safe(devisController.getLignesByDevis, 'getLignesByDevis')
);

// ✅ NOUVEAUX ENDPOINTS PDF + HEADER

// Header d’un devis (utilisé par ta page détails)
router.get(
  '/:id',
  verifyToken,
  safe(devisController.getDevisById, 'getDevisById')
);

// Ouvrir/générer le PDF d’un devis
router.get(
  '/:id/pdf',
  verifyToken,
  safe(devisController.getDevisPdf, 'getDevisPdf')
);

// Régénérer le PDF d’un devis
router.post(
  '/:id/pdf/regenerate',
  verifyToken,
  safe(devisController.regenerateDevisPdf, 'regenerateDevisPdf')
);

module.exports = router;
