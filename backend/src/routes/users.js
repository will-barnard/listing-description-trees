const { Router } = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../db');

const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sanitizeUser(row) {
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    role: row.role,
    created_at: row.created_at
  };
}

// List all users (admin only, mounted with adminOnly in index.js)
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, email, username, role, created_at FROM users ORDER BY created_at ASC'
    );
    res.json(rows);
  } catch (err) {
    console.error('Error listing users:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new account directly (admin only)
router.post('/', async (req, res) => {
  const { email, username, password, role } = req.body;

  if (!email || typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
    return res.status(400).json({ error: 'A valid email is required' });
  }
  if (!username || typeof username !== 'string' || username.trim().length < 2) {
    return res.status(400).json({ error: 'Username must be at least 2 characters' });
  }
  if (!password || typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }
  const finalRole = role === 'admin' ? 'admin' : 'user';

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const { rows } = await pool.query(
      'INSERT INTO users (email, username, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING *',
      [email.trim().toLowerCase(), username.trim(), passwordHash, finalRole]
    );
    res.status(201).json(sanitizeUser(rows[0]));
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email or username already in use' });
    }
    console.error('Error creating user:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Change a user's role (admin only)
router.put('/:id/role', async (req, res) => {
  const userId = parseInt(req.params.id);
  if (isNaN(userId)) return res.status(400).json({ error: 'Invalid user id' });

  const { role } = req.body;
  if (role !== 'admin' && role !== 'user') {
    return res.status(400).json({ error: 'role must be "admin" or "user"' });
  }

  try {
    if (role === 'user' && String(req.user.id) === String(userId)) {
      return res.status(400).json({ error: 'You cannot remove your own admin access' });
    }

    if (role === 'user') {
      const { rows: admins } = await pool.query("SELECT id FROM users WHERE role = 'admin'");
      if (admins.length <= 1 && admins.some(a => String(a.id) === String(userId))) {
        return res.status(400).json({ error: 'Cannot remove the last admin' });
      }
    }

    const { rows } = await pool.query(
      'UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [role, userId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(sanitizeUser(rows[0]));
  } catch (err) {
    console.error('Error updating user role:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a user (admin only)
router.delete('/:id', async (req, res) => {
  const userId = parseInt(req.params.id);
  if (isNaN(userId)) return res.status(400).json({ error: 'Invalid user id' });

  if (String(req.user.id) === String(userId)) {
    return res.status(400).json({ error: 'You cannot delete your own account' });
  }

  try {
    const { rows: target } = await pool.query('SELECT role FROM users WHERE id = $1', [userId]);
    if (target.length === 0) return res.status(404).json({ error: 'User not found' });

    if (target[0].role === 'admin') {
      const { rows: admins } = await pool.query("SELECT id FROM users WHERE role = 'admin'");
      if (admins.length <= 1) {
        return res.status(400).json({ error: 'Cannot delete the last admin' });
      }
    }

    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    res.json({ ok: true });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
