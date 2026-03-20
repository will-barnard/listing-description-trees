const { Router } = require('express');
const { pool } = require('../db');

const router = Router();

// Get children of a node (or root nodes of a tree)
router.get('/children', async (req, res) => {
  const treeId = parseInt(req.query.tree_id);
  if (isNaN(treeId)) return res.status(400).json({ error: 'tree_id is required' });

  const parentId = req.query.parent_id ? parseInt(req.query.parent_id) : null;

  try {
    let rows;
    if (parentId === null) {
      ({ rows } = await pool.query(
        'SELECT id, parent_id, label, copy, sort_order FROM nodes WHERE tree_id = $1 AND parent_id IS NULL ORDER BY sort_order',
        [treeId]
      ));
    } else {
      ({ rows } = await pool.query(
        'SELECT id, parent_id, label, copy, sort_order FROM nodes WHERE tree_id = $1 AND parent_id = $2 ORDER BY sort_order',
        [treeId, parentId]
      ));
    }
    res.json(rows);
  } catch (err) {
    console.error('Error getting children:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a single node
router.get('/:id', async (req, res) => {
  const nodeId = parseInt(req.params.id);
  if (isNaN(nodeId)) return res.status(400).json({ error: 'Invalid node id' });

  try {
    const { rows } = await pool.query(
      'SELECT id, tree_id, parent_id, label, copy, sort_order FROM nodes WHERE id = $1',
      [nodeId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Node not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Error getting node:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a node
router.post('/', async (req, res) => {
  const { tree_id, parent_id, label, copy, sort_order } = req.body;
  const treeId = parseInt(tree_id);
  if (isNaN(treeId)) return res.status(400).json({ error: 'tree_id is required' });
  if (!label || typeof label !== 'string' || label.trim().length === 0) {
    return res.status(400).json({ error: 'label is required' });
  }

  try {
    const { rows } = await pool.query(
      'INSERT INTO nodes (tree_id, parent_id, label, copy, sort_order) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [treeId, parent_id || null, label.trim(), copy || null, sort_order || 0]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error creating node:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Batch create nodes (for templates)
router.post('/batch', async (req, res) => {
  const { tree_id, parent_id, nodes } = req.body;
  const treeId = parseInt(tree_id);
  if (isNaN(treeId)) return res.status(400).json({ error: 'tree_id is required' });
  if (!Array.isArray(nodes) || nodes.length === 0) {
    return res.status(400).json({ error: 'nodes array is required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const created = [];
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (!n.label || typeof n.label !== 'string' || n.label.trim().length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Node at index ${i} is missing a label` });
      }
      const { rows } = await client.query(
        'INSERT INTO nodes (tree_id, parent_id, label, copy, sort_order) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [treeId, parent_id || null, n.label.trim(), n.copy || null, n.sort_order || i]
      );
      created.push(rows[0]);
    }
    await client.query('COMMIT');
    res.status(201).json(created);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error batch creating nodes:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Update a node
router.put('/:id', async (req, res) => {
  const nodeId = parseInt(req.params.id);
  if (isNaN(nodeId)) return res.status(400).json({ error: 'Invalid node id' });

  const { label, copy, sort_order } = req.body;
  if (label !== undefined && (typeof label !== 'string' || label.trim().length === 0)) {
    return res.status(400).json({ error: 'label cannot be empty' });
  }

  try {
    const current = await pool.query('SELECT * FROM nodes WHERE id = $1', [nodeId]);
    if (current.rows.length === 0) return res.status(404).json({ error: 'Node not found' });

    const node = current.rows[0];
    const { rows } = await pool.query(
      'UPDATE nodes SET label = $1, copy = $2, sort_order = $3, updated_at = NOW() WHERE id = $4 RETURNING *',
      [
        label !== undefined ? label.trim() : node.label,
        copy !== undefined ? copy : node.copy,
        sort_order !== undefined ? sort_order : node.sort_order,
        nodeId
      ]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('Error updating node:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Move a node (change parent)
router.put('/:id/move', async (req, res) => {
  const nodeId = parseInt(req.params.id);
  if (isNaN(nodeId)) return res.status(400).json({ error: 'Invalid node id' });

  const { new_parent_id } = req.body;

  // Prevent moving a node under itself or its own descendants
  if (new_parent_id !== null && new_parent_id !== undefined) {
    const newParentId = parseInt(new_parent_id);
    if (isNaN(newParentId)) return res.status(400).json({ error: 'Invalid new_parent_id' });

    // Walk up from new_parent_id to ensure nodeId is not an ancestor
    try {
      let currentId = newParentId;
      while (currentId !== null) {
        if (currentId === nodeId) {
          return res.status(400).json({ error: 'Cannot move a node under its own descendant' });
        }
        const { rows } = await pool.query('SELECT parent_id FROM nodes WHERE id = $1', [currentId]);
        if (rows.length === 0) break;
        currentId = rows[0].parent_id;
      }
    } catch (err) {
      console.error('Error checking ancestry:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  try {
    const { rows } = await pool.query(
      'UPDATE nodes SET parent_id = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [new_parent_id || null, nodeId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Node not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Error moving node:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a node (cascades to children)
router.delete('/:id', async (req, res) => {
  const nodeId = parseInt(req.params.id);
  if (isNaN(nodeId)) return res.status(400).json({ error: 'Invalid node id' });

  try {
    // Get the node and all descendants for undo support (return them before deleting)
    const { rows: deleted } = await pool.query(
      `WITH RECURSIVE descendants AS (
        SELECT id, tree_id, parent_id, label, copy, sort_order FROM nodes WHERE id = $1
        UNION ALL
        SELECT n.id, n.tree_id, n.parent_id, n.label, n.copy, n.sort_order
        FROM nodes n JOIN descendants d ON n.parent_id = d.id
      )
      SELECT * FROM descendants`,
      [nodeId]
    );

    if (deleted.length === 0) return res.status(404).json({ error: 'Node not found' });

    await pool.query('DELETE FROM nodes WHERE id = $1', [nodeId]);
    res.json({ ok: true, deleted });
  } catch (err) {
    console.error('Error deleting node:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Restore nodes (for undo)
router.post('/restore', async (req, res) => {
  const { nodes } = req.body;
  if (!Array.isArray(nodes) || nodes.length === 0) {
    return res.status(400).json({ error: 'nodes array is required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const restored = [];
    for (const n of nodes) {
      const { rows } = await client.query(
        'INSERT INTO nodes (id, tree_id, parent_id, label, copy, sort_order) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING RETURNING *',
        [n.id, n.tree_id, n.parent_id, n.label, n.copy, n.sort_order]
      );
      if (rows.length > 0) restored.push(rows[0]);
    }
    await client.query('COMMIT');
    res.status(201).json(restored);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error restoring nodes:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

module.exports = router;
