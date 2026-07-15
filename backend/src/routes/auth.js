const { Router } = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../db');
const { signToken, setAuthCookie, clearAuthCookie } = require('../middleware/auth');

const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sanitizeUser(row) {
  return { id: row.id, email: row.email, username: row.username, role: row.role };
}

function validateCredentials({ email, username, password }) {
  if (!email || typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
    return 'A valid email is required';
  }
  if (!username || typeof username !== 'string' || username.trim().length < 2) {
    return 'Username must be at least 2 characters';
  }
  if (!password || typeof password !== 'string' || password.length < 8) {
    return 'Password must be at least 8 characters';
  }
  return null;
}

// Public: tells the frontend whether to show the register (bootstrap) screen
// or the login screen.
router.get('/status', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM users');
    res.json({ hasUsers: rows[0].count > 0 });
  } catch (err) {
    console.error('Error checking auth status:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Register the very first user. Only works while the users table is empty —
// that user becomes the admin. After that, accounts can only be created by
// an existing admin (see /api/users).
router.post('/register', async (req, res) => {
  const { email, username, password } = req.body;

  const validationError = validateCredentials({ email, username, password });
  if (validationError) return res.status(400).json({ error: validationError });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: countRows } = await client.query('SELECT COUNT(*)::int AS count FROM users');
    if (countRows[0].count > 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Registration is closed. Ask an admin to create your account.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const { rows } = await client.query(
      'INSERT INTO users (email, username, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING *',
      [email.trim().toLowerCase(), username.trim(), passwordHash, 'admin']
    );
    await client.query('COMMIT');

    const user = sanitizeUser(rows[0]);
    const token = signToken(user);
    setAuthCookie(res, token);
    res.status(201).json({ user });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email or username already in use' });
    }
    console.error('Error registering user:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Login with email or username + password.
router.post('/login', async (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || typeof identifier !== 'string' || !password) {
    return res.status(400).json({ error: 'Email/username and password are required' });
  }

  try {
    const { rows } = await pool.query(
      'SELECT * FROM users WHERE LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($1)',
      [identifier.trim()]
    );
    const userRow = rows[0];

    if (!userRow) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, userRow.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = sanitizeUser(userRow);
    const token = signToken(user);
    setAuthCookie(res, token);
    res.json({ user });
  } catch (err) {
    console.error('Error logging in:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/logout', (req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

module.exports = router;
