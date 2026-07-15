const { Router } = require('express');
const { pool } = require('../db');

const router = Router();

// Any authenticated user can read the app settings (the org name is shown
// on the home page for everyone).
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT org_name FROM app_settings WHERE id = 1');
    res.json({ orgName: rows[0]?.org_name || 'Your Trees' });
  } catch (err) {
    console.error('Error getting settings:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Only admins can change them.
router.put('/', async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { orgName } = req.body;
  if (!orgName || typeof orgName !== 'string' || orgName.trim().length === 0) {
    return res.status(400).json({ error: 'orgName is required' });
  }
  if (orgName.trim().length > 255) {
    return res.status(400).json({ error: 'orgName is too long' });
  }

  try {
    const { rows } = await pool.query(
      'UPDATE app_settings SET org_name = $1, updated_at = NOW() WHERE id = 1 RETURNING org_name',
      [orgName.trim()]
    );
    res.json({ orgName: rows[0].org_name });
  } catch (err) {
    console.error('Error updating settings:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
