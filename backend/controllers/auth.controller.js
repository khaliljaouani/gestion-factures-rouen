const db = require('../config/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const SECRET_KEY = process.env.JWT_SECRET || 'rouenpneus_secret';

// Supprime accents/espaces et fabrique prenom_nom
const toUsername = (prenom, nom) => {
  const normalize = (s) =>
    s
      .toString()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '_')
      .toLowerCase();
  return `${normalize(prenom)}_${normalize(nom)}`;
};

exports.register = async (req, res) => {
  try {
    const { prenom, nom, mot_de_passe } = req.body;
    if (!prenom || !nom || !mot_de_passe) {
      return res.status(400).json({ error: 'Champs requis manquants' });
    }

    const nom_utilisateur = toUsername(prenom, nom);

    const exists = db
      .prepare('SELECT id FROM utilisateurs WHERE nom_utilisateur = ?')
      .get(nom_utilisateur);
    if (exists) {
      return res
        .status(409)
        .json({ error: "Ce nom d'utilisateur existe déjà", nom_utilisateur });
    }

    const hash = await bcrypt.hash(mot_de_passe, 10);
    const info = db
      .prepare(
        `INSERT INTO utilisateurs (nom_utilisateur, mot_de_passe, nom, prenom, role)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(nom_utilisateur, hash, nom.trim(), prenom.trim(), 'admin');

    const user = {
      id: info.lastInsertRowid,
      nom,
      prenom,
      role: 'admin',
      nom_utilisateur,
    };

    return res.status(201).json({ user });
  } catch (e) {
    console.error('❌ Erreur register:', e);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
};

exports.login = async (req, res) => {
  try {
    const { nom_utilisateur, mot_de_passe } = req.body;
    if (!nom_utilisateur || !mot_de_passe) {
      return res.status(400).json({ error: 'Identifiants manquants' });
    }

    const user = db
      .prepare('SELECT * FROM utilisateurs WHERE nom_utilisateur = ?')
      .get(nom_utilisateur.trim());

    if (!user) return res.status(401).json({ error: 'Utilisateur non trouvé' });

    const ok = await bcrypt.compare(mot_de_passe, user.mot_de_passe);
    if (!ok) return res.status(401).json({ error: 'Mot de passe incorrect' });

    const token = jwt.sign(
      { id: user.id, nom: user.nom, prenom: user.prenom, role: user.role },
      SECRET_KEY,
      { expiresIn: '2h' }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        nom: user.nom,
        prenom: user.prenom,
        role: user.role,
        nom_utilisateur: user.nom_utilisateur,
      },
    });
  } catch (e) {
    console.error('❌ Erreur login:', e);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
};
