const jwt = require('jsonwebtoken');
const config = require('../config');

/** Like authRequired but never throws — just attaches req.user if valid. */
function optionalAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    try {
      req.user = jwt.verify(token, config.jwt.secret);
    } catch {
      // ignore — treat as guest
    }
  }
  next();
}

module.exports = { optionalAuth };
