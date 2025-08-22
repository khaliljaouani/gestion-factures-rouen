// 📁 backend/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const SECRET_KEY = process.env.JWT_SECRET || 'rouenpneus_secret';

function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Accès non autorisé - Token manquant' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // ✅ Vérifie le token avec jwt.verify
    const decoded = jwt.verify(token, SECRET_KEY);
    req.user = decoded; // Optionnel : pour l'utiliser ensuite
    next();
  } catch (err) {
    console.error("❌ Token invalide :", err.message);
    return res.status(403).json({ message: 'Token invalide' });
  }
}

module.exports = { verifyToken };
