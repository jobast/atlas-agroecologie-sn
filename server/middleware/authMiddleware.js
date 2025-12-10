const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'supersecretkey';

// Vérifie qu'un token est présent et valide
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user; // { id, role }
    next();
  });
}

// Middleware pour vérifier le rôle
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Accès interdit' });
    }
    next();
  };
}

module.exports = {
  authenticateToken,
  requireRole
};