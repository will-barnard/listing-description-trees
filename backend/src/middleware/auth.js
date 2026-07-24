const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const AUTH_DISABLED = process.env.AUTH_DISABLED === 'true';
const JWT_SECRET = process.env.JWT_SECRET;
const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || 'auth_token';
const ISSUER = 'listing-description-trees';
const TOKEN_TTL = '24h';

// Non-interactive API tokens for programmatic clients (e.g. Claude / MCP).
// Comma-separated list so tokens can be rotated without downtime. Any request
// with `Authorization: Bearer <token>` matching one of these authenticates as
// a service admin. Generate one with: openssl rand -hex 32
const API_TOKENS = (process.env.API_TOKEN || '')
  .split(',')
  .map(t => t.trim())
  .filter(Boolean);

// The identity attached to requests authenticated via an API token. `id: 0`
// mirrors the AUTH_DISABLED dev user and keeps `created_by` readable in the DB.
const API_USER = {
  id: 0,
  email: 'api@listing-trees',
  username: 'claude-api',
  role: 'admin'
};

if (!AUTH_DISABLED && !JWT_SECRET) {
  console.error('JWT_SECRET environment variable is required');
  process.exit(1);
}

// Constant-time compare so token validation doesn't leak length/contents via
// timing. Returns true if `candidate` matches any configured API token.
function matchesApiToken(candidate) {
  const a = Buffer.from(candidate);
  return API_TOKENS.some(token => {
    const b = Buffer.from(token);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  });
}

// Pull a bearer token out of the Authorization header, if present.
function getBearerToken(req) {
  const header = req.headers['authorization'] || req.headers['Authorization'];
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match ? match[1].trim() : null;
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

  // Programmatic clients authenticate with a static API token in the
  // Authorization header instead of the browser session cookie. Checked first
  // so tools like Claude never need to go through the cookie login flow.
  const bearer = getBearerToken(req);
  if (bearer) {
    if (API_TOKENS.length > 0 && matchesApiToken(bearer)) {
      req.user = { ...API_USER };
      return next();
    }
    return res.status(401).json({ error: 'Invalid API token', code: 'INVALID_API_TOKEN' });
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
