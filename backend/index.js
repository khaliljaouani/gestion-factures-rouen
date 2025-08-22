// backend/index.js

/* 1) ENV (optionnel) */
let dotenvLoaded = false;
try { require('dotenv').config(); dotenvLoaded = true; }
catch (e) { console.log('[backend] Dotenv introuvable (OK):', e?.code || e?.message); }

/* 2) Imports */
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const os = require('os');

/* 3) App + middlewares de base  (⚠️ créer app AVANT tout app.use) */
const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

/* 4) Dossiers Documents/gestion */
const ROOT_GESTION = path.join(os.homedir(), 'Documents', 'gestion');
const DIR_FACTURES = path.join(ROOT_GESTION, 'facture');
const DIR_FACTURES_CACHE = path.join(ROOT_GESTION, 'facture', 'facture_cacher');
const DIR_DEVIS = path.join(ROOT_GESTION, 'devis');
for (const d of [ROOT_GESTION, DIR_FACTURES, DIR_FACTURES_CACHE, DIR_DEVIS]) {
  try { fs.mkdirSync(d, { recursive: true }); } catch {}
}

/* 5) Fichiers statiques (logo + aperçus) */
app.use('/static', express.static(path.join(__dirname, 'storage'), { maxAge: '1y' }));
app.use('/files/factures', express.static(DIR_FACTURES));
app.use('/files/devis', express.static(DIR_DEVIS));

/* 6) Ping */
app.get('/health', (_req, res) => res.status(200).send('OK'));
app.get('/', (_req, res) => res.send('🚀 API OK'));

/* 7) Routes métier */
const clientRoutes = require('./routes/client.routes');
const voitureRoutes = require('./routes/voiture.routes');
const factureRoutes = require('./routes/facture.routes');
const devisRoutes = require('./routes/devis.routes');
const statistiqueRoutes = require('./routes/statistiques.routes');
const authRoutes = require('./routes/auth.routes');
const countersRoutes = require('./routes/counters.routes');

const statsRoutes = require('./routes/statistiques.routes');
app.use('/api/stats', statsRoutes);

app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/voitures', voitureRoutes);
app.use('/api/factures', factureRoutes);
app.use('/api/devis', devisRoutes);
app.use('/api/statistiques', statistiqueRoutes);
app.use('/api/counters', countersRoutes);

/* 8) 404 + erreurs */
app.use((req, res) => res.status(404).json({ error: 'Not found', path: req.path }));
app.use((err, _req, res, _next) => {
  console.error('[API ERR]', err);
  res.status(500).json({ error: 'internal', message: err?.message || String(err) });
});

/* 9) Lancement */
const PORT = Number(process.env.PORT || process.env.API_PORT || 4000);
app.listen(PORT, '127.0.0.1', () =>
  console.log(`✅ Backend running on http://localhost:${PORT} (dotenv=${dotenvLoaded})`)
);
