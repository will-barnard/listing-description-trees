const { Router } = require('express');
const { pool } = require('../db');

const router = Router();

// List all trees
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, description, created_by, created_at, updated_at FROM trees ORDER BY updated_at DESC'
    );
    res.json(rows);
  } catch (err) {
    console.error('Error listing trees:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a single tree with all its nodes
router.get('/:id', async (req, res) => {
  const treeId = parseInt(req.params.id);
  if (isNaN(treeId)) return res.status(400).json({ error: 'Invalid tree id' });

  try {
    const treeResult = await pool.query('SELECT * FROM trees WHERE id = $1', [treeId]);
    if (treeResult.rows.length === 0) return res.status(404).json({ error: 'Tree not found' });

    const nodesResult = await pool.query(
      'SELECT id, parent_id, label, copy, sort_order FROM nodes WHERE tree_id = $1 ORDER BY sort_order',
      [treeId]
    );

    res.json({
      ...treeResult.rows[0],
      nodes: nodesResult.rows
    });
  } catch (err) {
    console.error('Error getting tree:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a tree
router.post('/', async (req, res) => {
  const { name, description } = req.body;
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Name is required' });
  }

  try {
    const { rows } = await pool.query(
      'INSERT INTO trees (name, description, created_by) VALUES ($1, $2, $3) RETURNING *',
      [name.trim(), description || null, req.user.username]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error creating tree:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a tree
router.put('/:id', async (req, res) => {
  const treeId = parseInt(req.params.id);
  if (isNaN(treeId)) return res.status(400).json({ error: 'Invalid tree id' });

  const { name, description } = req.body;
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Name is required' });
  }

  try {
    const { rows } = await pool.query(
      'UPDATE trees SET name = $1, description = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
      [name.trim(), description || null, treeId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Tree not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Error updating tree:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a tree
router.delete('/:id', async (req, res) => {
  const treeId = parseInt(req.params.id);
  if (isNaN(treeId)) return res.status(400).json({ error: 'Invalid tree id' });

  try {
    const { rowCount } = await pool.query('DELETE FROM trees WHERE id = $1', [treeId]);
    if (rowCount === 0) return res.status(404).json({ error: 'Tree not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error('Error deleting tree:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
