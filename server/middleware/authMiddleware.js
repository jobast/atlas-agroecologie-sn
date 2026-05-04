const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'supersecretkey';

const ROLE_HIERARCHY = { 'editor': 1, 'dytael_admin': 2, 'dytaes_admin': 3 };

// Roles whose authority is read-only by design.
// DyTAES holds national oversight: it can consult all DyTAELs but never
// mutate initiative data — sovereignty stays with each DyTAEL.
const READ_ONLY_ROLES = new Set(['dytaes_admin']);

function normalizeRole(role) {
  return role === 'admin' ? 'dytael_admin' : role;
}

function hasRole(userRole, requiredRole) {
  const normalized = normalizeRole(userRole);
  const required = normalizeRole(requiredRole);
  return (ROLE_HIERARCHY[normalized] || 0) >= (ROLE_HIERARCHY[required] || 0);
}

function isReadOnlyRole(role) {
  return READ_ONLY_ROLES.has(normalizeRole(role));
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user; // { id, role, dytael_id }
    next();
  });
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(403).json({ message: 'Accès interdit' });
    }
    const userRole = normalizeRole(req.user.role);
    const allowed = roles.some(r => hasRole(userRole, normalizeRole(r)));
    if (!allowed) {
      return res.status(403).json({ message: 'Accès interdit' });
    }
    next();
  };
}

// Block any mutation when the caller's role is read-only (DyTAES).
function denyReadOnlyRoles(req, res, next) {
  if (req.user && isReadOnlyRole(req.user.role)) {
    return res.status(403).json({
      error: "La DyTAES dispose d'un accès en lecture seule. Les modifications restent sous l'autorité du DyTAEL concerné."
    });
  }
  next();
}

module.exports = {
  authenticateToken,
  requireRole,
  denyReadOnlyRoles,
  hasRole,
  isReadOnlyRole,
  normalizeRole
};
