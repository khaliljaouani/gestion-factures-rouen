// middleware/verifyToken.js
const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  console.log("🔐 Auth reçu :", authHeader);

  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.warn("⛔ Aucun token trouvé dans le header.");
    return res.sendStatus(401); // Unauthorized
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.error("⛔ Token invalide :", err.message);
      return res.sendStatus(403); // Forbidden
    }
    req.user = user; // utilisateur décodé
    next();
  });
};

module.exports = verifyToken;
