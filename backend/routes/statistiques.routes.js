// backend/routes/statistiques.routes.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/statistique.controller');

router.get('/summary', ctrl.getSummary);
router.get('/daily', ctrl.getDaily);
router.get('/top-clients', ctrl.getTopClients);
router.get('/daily-docs', ctrl.getDocsByDay);
router.get('/health', (_req, res) => res.json({ ok: true })); // debug

module.exports = router;
