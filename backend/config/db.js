// backend/config/db.js
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const ROOT_DIR =
  process.env.DB_DIR ||
  process.env.PORTABLE_EXECUTABLE_DIR ||
  path.join(process.cwd(), 'data');

fs.mkdirSync(ROOT_DIR, { recursive: true });
const DB_PATH = path.join(ROOT_DIR, 'gestion.db');

const db = new Database(DB_PATH);

// === Création des tables si elles n’existent pas ===

// Utilisateurs
db.exec(`
CREATE TABLE IF NOT EXISTS utilisateurs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nom_utilisateur TEXT UNIQUE NOT NULL,
  mot_de_passe TEXT NOT NULL,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin'
);
`);

// Clients
db.exec(`
CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  civilite TEXT,
  nom TEXT,
  prenom TEXT,
  type TEXT,
  adresse TEXT,
  code_postal TEXT,
  ville TEXT,
  email TEXT,
  telephone TEXT
);
`);

// Voitures
db.exec(`
CREATE TABLE IF NOT EXISTS voitures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  immatriculation TEXT,
  kilometrage INTEGER,
  client_id INTEGER,
  FOREIGN KEY (client_id) REFERENCES clients(id)
);
`);

// Factures
db.exec(`
CREATE TABLE IF NOT EXISTS factures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  numero TEXT,
  date_facture TEXT,
  montant_ttc REAL,
  remise REAL,
  statut TEXT,
  voiture_id INTEGER,
  created_by TEXT,
  request_id TEXT,
  FOREIGN KEY (voiture_id) REFERENCES voitures(id)
);
`);

// Lignes de facture
db.exec(`
CREATE TABLE IF NOT EXISTS facture_lignes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  facture_id INTEGER,
  reference TEXT,
  description TEXT,
  quantite REAL,
  prix_unitaire REAL,
  remise REAL,
  tva REAL,
  total_ht REAL,
  FOREIGN KEY (facture_id) REFERENCES factures(id)
);
`);

// Devis
db.exec(`
CREATE TABLE IF NOT EXISTS devis (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  numero TEXT,
  date_devis TEXT,
  montant_ttc REAL,
  statut TEXT,
  voiture_id INTEGER,
  created_by TEXT,
  FOREIGN KEY (voiture_id) REFERENCES voitures(id)
);
`);

// Lignes de devis
db.exec(`
CREATE TABLE IF NOT EXISTS devis_lignes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  devis_id INTEGER,
  reference TEXT,
  description TEXT,
  quantite REAL,
  prix_unitaire REAL,
  remise REAL,
  tva REAL,
  total_ht REAL,
  FOREIGN KEY (devis_id) REFERENCES devis(id)
);
`);

// Counters
db.exec(`
CREATE TABLE IF NOT EXISTS counters (
  type TEXT PRIMARY KEY,
  last_number INTEGER,
  updated_at TEXT,
  updated_by TEXT
);
`);

// Paramètres
db.exec(`
CREATE TABLE IF NOT EXISTS parametres (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  numero_facture INTEGER,
  numero_facture_cachee INTEGER,
  numero_devis INTEGER
);
`);

module.exports = db;
