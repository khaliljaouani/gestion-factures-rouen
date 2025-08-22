const db = require('../config/db');

// 🔹 Créer un client
exports.createClient = (req, res) => {
  const {
    civilite, nom, prenom, type,
    adresse, codePostal, ville, email, telephone
  } = req.body;

  try {
    const stmt = db.prepare(`
      INSERT INTO clients (
        civilite, nom, prenom, type, adresse, code_postal, ville, email, telephone
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(civilite, nom, prenom, type, adresse, codePostal, ville, email, telephone);

    return res.status(201).json({
      id: result.lastInsertRowid,
      civilite, nom, prenom, type,
      adresse, codePostal, ville, email, telephone
    });

  } catch (err) {
    console.error("❌ Erreur ajout client :", err.message);
    return res.status(500).json({
      message: "Erreur lors de l'ajout du client",
      error: err.message
    });
  }
};

// 🔹 Récupérer tous les clients
exports.getClients = (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT 
        id,
        civilite,
        nom,
        prenom,
        type,
        adresse,
        code_postal AS codePostal,
        ville,
        email,
        telephone
      FROM clients
    `).all();

    return res.json(rows);
  } catch (err) {
    console.error('❌ Erreur récupération clients :', err.message);
    return res.status(500).json({ message: "Erreur lors de la récupération des clients", error: err.message });
  }
};

// 🔹 Récupérer un client par ID
exports.getClientById = (req, res) => {
  const clientId = req.params.id;

  try {
    const row = db.prepare('SELECT * FROM clients WHERE id = ?').get(clientId);

    if (!row) {
      return res.status(404).json({ error: 'Client introuvable' });
    }

    return res.json(row);
  } catch (err) {
    console.error('❌ Erreur récupération client :', err.message);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
};

// 🔹 Modifier un client
exports.updateClient = (req, res) => {
  const clientId = req.params.id;
  const {
    civilite, nom, prenom, type,
    adresse, codePostal, ville, email, telephone
  } = req.body;

  try {
    const stmt = db.prepare(`
      UPDATE clients SET
        civilite = ?, nom = ?, prenom = ?, type = ?,
        adresse = ?, code_postal = ?, ville = ?, email = ?, telephone = ?
      WHERE id = ?
    `);

    const result = stmt.run(civilite, nom, prenom, type, adresse, codePostal, ville, email, telephone, clientId);

    if (result.changes === 0) {
      return res.status(404).json({ message: 'Client introuvable pour mise à jour' });
    }

    return res.json({ message: 'Client mis à jour avec succès' });

  } catch (err) {
    console.error('❌ Erreur mise à jour client :', err.message);
    return res.status(500).json({ message: 'Erreur lors de la mise à jour du client', error: err.message });
  }
};

// 🔹 Supprimer un client
exports.deleteClient = (req, res) => {
  const clientId = req.params.id;

  try {
    const result = db.prepare('DELETE FROM clients WHERE id = ?').run(clientId);

    if (result.changes === 0) {
      return res.status(404).json({ message: 'Client introuvable pour suppression' });
    }

    return res.json({ message: 'Client supprimé avec succès' });

  } catch (err) {
    console.error('❌ Erreur suppression client :', err.message);
    return res.status(500).json({ message: 'Erreur lors de la suppression du client', error: err.message });
  }
};
