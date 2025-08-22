// routes/facture.routes.js
const express = require('express');
const router = express.Router();

const factureController = require('../controllers/facture.controller');
const { verifyToken } = require('../middleware/authMiddleware'); // voir §3

router.post('/complete', verifyToken, factureController.createFactureComplete);
router.get('/:id/lignes', verifyToken, factureController.getLignesByFacture);
router.get('/', verifyToken, factureController.getAllFactures);

router.get('/:id', verifyToken, factureController.getFactureById);
router.get('/:id/pdf', verifyToken, factureController.getFacturePdf);
router.post('/:id/pdf/regenerate', verifyToken, factureController.regenerateFacturePdf);


module.exports = router; // ✅ impératif (PAS "export default", PAS "exports.router")
