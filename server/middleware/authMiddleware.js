const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'supersecretkey';

// `super_admin` is a transitional break-glass role: full powers, no scoping.
// It is NOT part of the governance model — only used while operators bootstrap
// real DyTAEL admins. Should be removed once ownership has been handed over.
const ROLE_HIERARCHY = { 'editor': 1, 'dytael_admin': 2, 'dytaes_admin': 3, 'super_admin': 4 };

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

function isSuperAdmin(role) {
  return normalizeRole(role) === 'super_admin';
}

// 12-hour sliding window. When the verified token is older than this, we
// mint a fresh 1-day JWT and surface it via X-Refreshed-Token; the axios
// interceptor on the client swaps it into localStorage transparently.
const SLIDING_REFRESH_AFTER_S = 12 * 60 * 60;
const JWT_TTL = '1d';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, SECRET, (err, user) => {
    // 401 (not 403) for an invalid/expired token — the client interceptor
    // treats 401 as "session expired, log the user out".
    if (err) return res.sendStatus(401);
    req.user = user; // { id, role, dytael_id, iat, exp }

    const nowS = Math.floor(Date.now() / 1000);
    if (user.iat && (nowS - user.iat) > SLIDING_REFRESH_AFTER_S) {
      try {
        const refreshed = jwt.sign(
          { id: user.id, role: user.role, dytael_id: user.dytael_id || null },
          SECRET,
          { expiresIn: JWT_TTL }
        );
        res.setHeader('X-Refreshed-Token', refreshed);
      } catch (_) { /* best-effort; old token still valid for the request */ }
    }
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
  isSuperAdmin,
  normalizeRole
};
