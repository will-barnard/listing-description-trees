const jwt = require('jsonwebtoken');
const jwksRsa = require('jwks-rsa');

const AUTH_DISABLED = process.env.AUTH_DISABLED === 'true';
const AUTH_JWKS_URL = process.env.AUTH_JWKS_URL;
const AUTH_ISSUER = process.env.AUTH_ISSUER;
const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || 'brew_token';

if (!AUTH_DISABLED && (!AUTH_JWKS_URL || !AUTH_ISSUER)) {
  console.error('AUTH_JWKS_URL and AUTH_ISSUER environment variables are required');
  process.exit(1);
}

const jwksClient = jwksRsa({
  jwksUri: AUTH_JWKS_URL,
  cache: true,
  cacheMaxAge: 600000 // 10 minutes
});

function getKey(header, callback) {
  jwksClient.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    callback(null, key.getPublicKey());
  });
}

function verifyToken(token) {
  return new Promise((resolve, reject) => {
    jwt.verify(token, getKey, {
      algorithms: ['RS256'],
      issuer: AUTH_ISSUER
    }, (err, decoded) => {
      if (err) return reject(err);
      resolve(decoded);
    });
  });
}

async function authMiddleware(req, res, next) {
  if (AUTH_DISABLED) {
    req.user = { id: 'dev', email: 'dev@localhost', username: 'dev', role: 'super_admin' };
    return next();
  }

  const token = req.cookies[AUTH_COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  try {
    const decoded = await verifyToken(token);
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      username: decoded.username,
      role: decoded.role
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = authMiddleware;
