const express = require('express');
const router = express.Router();

const clientController = require('../controllers/client.controller');
const voitureController = require('../controllers/voiture.controller');
const { verifyToken } = require('../middleware/authMiddleware');


// ====================== CLIENT ROUTES ======================

// 🔹 Créer un client
router.post('/', verifyToken, clientController.createClient);

// 🔹 Obtenir tous les clients
router.get('/', verifyToken, clientController.getClients);

// 🔹 Obtenir un client par ID
router.get('/:id', verifyToken, clientController.getClientById); // <-- sécurisée ici aussi

// 🔹 Modifier un client
router.put('/:id', verifyToken, clientController.updateClient);

// 🔹 Supprimer un client
router.delete('/:id', verifyToken, clientController.deleteClient);

// 🔹 Obtenir les voitures d’un client
router.get('/:id/voitures', verifyToken, voitureController.getVoituresByClient);

module.exports = router;
