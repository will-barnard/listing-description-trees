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

// Import a whole tree (name + nested nodes) in one shot. Body shape:
//   { name, description?, nodes: [ { label, copy?, children? }, ... ] }
// `nodes` is recursive — each entry may have its own `children` array.
// Everything is created in a single transaction so a bad node partway
// through doesn't leave a half-built tree behind.
function validateImportNodes(nodes, path = 'nodes') {
  if (!Array.isArray(nodes)) {
    return `${path} must be an array`;
  }
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    const nodePath = `${path}[${i}]`;
    if (!n || typeof n !== 'object') {
      return `${nodePath} must be an object`;
    }
    if (!n.label || typeof n.label !== 'string' || n.label.trim().length === 0) {
      return `${nodePath}.label is required`;
    }
    if (n.copy !== undefined && n.copy !== null && typeof n.copy !== 'string') {
      return `${nodePath}.copy must be a string`;
    }
    if (n.children !== undefined) {
      const childError = validateImportNodes(n.children, `${nodePath}.children`);
      if (childError) return childError;
    }
  }
  return null;
}

async function insertImportNode(client, treeId, parentId, node, sortOrder) {
  const { rows } = await client.query(
    'INSERT INTO nodes (tree_id, parent_id, label, copy, sort_order) VALUES ($1, $2, $3, $4, $5) RETURNING id',
    [treeId, parentId, node.label.trim(), node.copy || null, sortOrder]
  );
  const nodeId = rows[0].id;
  let count = 1;
  if (Array.isArray(node.children)) {
    for (let i = 0; i < node.children.length; i++) {
      count += await insertImportNode(client, treeId, nodeId, node.children[i], i);
    }
  }
  return count;
}

router.post('/import', async (req, res) => {
  const { name, description, nodes } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const nodesError = validateImportNodes(nodes || []);
  if (nodesError) {
    return res.status(400).json({ error: nodesError });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: treeRows } = await client.query(
      'INSERT INTO trees (name, description, created_by) VALUES ($1, $2, $3) RETURNING *',
      [name.trim(), description || null, req.user.username]
    );
    const tree = treeRows[0];

    let nodeCount = 0;
    const topLevel = nodes || [];
    for (let i = 0; i < topLevel.length; i++) {
      nodeCount += await insertImportNode(client, tree.id, null, topLevel[i], i);
    }

    await client.query('COMMIT');
    res.status(201).json({ ...tree, nodeCount });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error importing tree:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
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
