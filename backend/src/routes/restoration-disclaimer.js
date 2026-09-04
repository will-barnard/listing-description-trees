const { Router } = require('express');
const { pool } = require('../db');

const router = Router();

// Unlike routes/settings.js (org name, admin-only), this is listing copy —
// any signed-in user can read or edit it, the same as tree/node copy.

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT restoration_disclaimer FROM app_settings WHERE id = 1');
    res.json({ restorationDisclaimer: rows[0]?.restoration_disclaimer || '' });
  } catch (err) {
    console.error('Error getting restoration disclaimer:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/', async (req, res) => {
  const { restorationDisclaimer } = req.body;
  if (typeof restorationDisclaimer !== 'string') {
    return res.status(400).json({ error: 'restorationDisclaimer is required' });
  }
  if (restorationDisclaimer.length > 20000) {
    return res.status(400).json({ error: 'restorationDisclaimer is too long' });
  }

  try {
    const { rows } = await pool.query(
      'UPDATE app_settings SET restoration_disclaimer = $1, updated_at = NOW() WHERE id = 1 RETURNING restoration_disclaimer',
      [restorationDisclaimer]
    );
    res.json({ restorationDisclaimer: rows[0].restoration_disclaimer });
  } catch (err) {
    console.error('Error updating restoration disclaimer:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
