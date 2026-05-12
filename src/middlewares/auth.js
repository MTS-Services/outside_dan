const jwt = require('jsonwebtoken');
const config = require('../config');
const { ApiError } = require('./error');

const STAFF_ROLES = ['ADMIN', 'SUBADMIN', 'STAFF']; // STAFF kept for back-compat

function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(new ApiError(401, 'Nicht angemeldet'));
  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = decoded;
    next();
  } catch {
    next(new ApiError(401, 'Sitzung abgelaufen'));
  }
}

function requireRole(...roles) {
  // Expand 'STAFF' alias so callers can pass either SUBADMIN or STAFF.
  const expanded = new Set(roles.flatMap((r) => (r === 'SUBADMIN' ? ['SUBADMIN', 'STAFF'] : [r])));
  return (req, res, next) => {
    if (!req.user) return next(new ApiError(401, 'Nicht angemeldet'));
    if (!expanded.has(req.user.role)) return next(new ApiError(403, 'Kein Zugriff'));
    next();
  };
}

const requireStaff = requireRole('ADMIN', 'SUBADMIN');
const requireAdmin = requireRole('ADMIN');

module.exports = { authRequired, requireRole, requireStaff, requireAdmin, STAFF_ROLES };
