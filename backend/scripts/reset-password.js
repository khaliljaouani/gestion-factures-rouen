const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const db = new Database('C:/gestion/base_de_donnees/gestion.db', { fileMustExist: true });

const [,, usernameArg, newPassArg] = process.argv;
if (!usernameArg || !newPassArg) {
  console.error('Usage: node backend/scripts/reset-password.js <nom_utilisateur> <nouveau_mdp>');
  process.exit(1);
}

const username = String(usernameArg).trim();
const hash = bcrypt.hashSync(String(newPassArg), 10);

const row = db.prepare('SELECT id FROM utilisateurs WHERE nom_utilisateur=?').get(username);
if (!row) {
  console.error(`Utilisateur "${username}" introuvable`);
  process.exit(2);
}

db.prepare('UPDATE utilisateurs SET mot_de_passe=? WHERE nom_utilisateur=?').run(hash, username);
console.log(`✅ Mot de passe mis à jour pour ${username}`);
