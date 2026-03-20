const { Router } = require('express');
const { pool } = require('../db');

const router = Router();

// List all templates
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM node_templates ORDER BY name'
    );
    res.json(rows);
  } catch (err) {
    console.error('Error listing templates:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a template
router.post('/', async (req, res) => {
  const { name, children } = req.body;
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Name is required' });
  }
  if (!Array.isArray(children) || children.length === 0) {
    return res.status(400).json({ error: 'Children array is required (at least one child label)' });
  }

  try {
    const { rows } = await pool.query(
      'INSERT INTO node_templates (name, children, created_by) VALUES ($1, $2, $3) RETURNING *',
      [name.trim(), JSON.stringify(children), req.user.username]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error creating template:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a template
router.put('/:id', async (req, res) => {
  const templateId = parseInt(req.params.id);
  if (isNaN(templateId)) return res.status(400).json({ error: 'Invalid template id' });

  const { name, children } = req.body;
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Name is required' });
  }

  try {
    const { rows } = await pool.query(
      'UPDATE node_templates SET name = $1, children = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
      [name.trim(), JSON.stringify(children || []), templateId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Template not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Error updating template:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a template
router.delete('/:id', async (req, res) => {
  const templateId = parseInt(req.params.id);
  if (isNaN(templateId)) return res.status(400).json({ error: 'Invalid template id' });

  try {
    const { rowCount } = await pool.query('DELETE FROM node_templates WHERE id = $1', [templateId]);
    if (rowCount === 0) return res.status(404).json({ error: 'Template not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error('Error deleting template:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
