const jwt = require('jsonwebtoken');

const AUTH_DISABLED = process.env.AUTH_DISABLED === 'true';
const JWT_SECRET = process.env.JWT_SECRET;
const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || 'auth_token';
const ISSUER = 'listing-description-trees';
const TOKEN_TTL = '24h';

if (!AUTH_DISABLED && !JWT_SECRET) {
  console.error('JWT_SECRET environment variable is required');
  process.exit(1);
}

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: TOKEN_TTL, issuer: ISSUER }
  );
}

function setAuthCookie(res, token) {
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000
  });
}

function clearAuthCookie(res) {
  res.clearCookie(AUTH_COOKIE_NAME);
}

async function authMiddleware(req, res, next) {
  if (AUTH_DISABLED) {
    req.user = { id: 0, email: 'dev@localhost', username: 'dev', role: 'admin' };
    return next();
  }

  const token = req.cookies[AUTH_COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated', code: 'NOT_AUTHENTICATED' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: ISSUER
    });
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      username: decoded.username,
      role: decoded.role
    };
    next();
  } catch (err) {
    clearAuthCookie(res);
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid token', code: 'INVALID_TOKEN' });
  }
}

function adminOnly(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

module.exports = authMiddleware;
module.exports.signToken = signToken;
module.exports.setAuthCookie = setAuthCookie;
module.exports.clearAuthCookie = clearAuthCookie;
module.exports.adminOnly = adminOnly;
module.exports.AUTH_COOKIE_NAME = AUTH_COOKIE_NAME;
