const request = require('supertest');
const { pool, migrate, createApp, resetDb } = require('./helpers');

const app = createApp();

const ADMIN = { email: 'admin@example.com', username: 'admin', password: 'correcthorse123' };

let agent;

beforeAll(async () => {
  await migrate();
});

beforeEach(async () => {
  await resetDb();
  agent = request.agent(app);
  await agent.post('/api/auth/register').send(ADMIN);
});

afterAll(async () => {
  await pool.end();
});

async function createTree(name = 'Product Descriptions') {
  const res = await agent.post('/api/trees').send({ name });
  return res.body;
}

describe('node move — cycle prevention', () => {
  it('blocks moving a node under its own descendant', async () => {
    const tree = await createTree();
    const { body: root } = await agent.post('/api/nodes').send({ tree_id: tree.id, label: 'Root' });
    const { body: child } = await agent.post('/api/nodes').send({ tree_id: tree.id, parent_id: root.id, label: 'Child' });
    const { body: grandchild } = await agent.post('/api/nodes').send({ tree_id: tree.id, parent_id: child.id, label: 'Grandchild' });

    // try to move root under its own grandchild — must be rejected
    const res = await agent.put(`/api/nodes/${root.id}/move`).send({ new_parent_id: grandchild.id });
    expect(res.status).toBe(400);

    // tree shape is unchanged
    const check = await agent.get(`/api/nodes/${root.id}`);
    expect(check.body.parent_id).toBeNull();
  });

  it('blocks moving a node directly under itself', async () => {
    const tree = await createTree();
    const { body: node } = await agent.post('/api/nodes').send({ tree_id: tree.id, label: 'Solo' });
    const res = await agent.put(`/api/nodes/${node.id}/move`).send({ new_parent_id: node.id });
    expect(res.status).toBe(400);
  });

  it('allows moving a node to a legitimate new parent', async () => {
    const tree = await createTree();
    const { body: a } = await agent.post('/api/nodes').send({ tree_id: tree.id, label: 'A' });
    const { body: b } = await agent.post('/api/nodes').send({ tree_id: tree.id, label: 'B' });

    const res = await agent.put(`/api/nodes/${b.id}/move`).send({ new_parent_id: a.id });
    expect(res.status).toBe(200);
    expect(res.body.parent_id).toBe(a.id);
  });
});

describe('cascading delete + undo', () => {
  it('deletes a node and all its descendants, returning them for undo', async () => {
    const tree = await createTree();
    const { body: root } = await agent.post('/api/nodes').send({ tree_id: tree.id, label: 'Root' });
    const { body: child } = await agent.post('/api/nodes').send({ tree_id: tree.id, parent_id: root.id, label: 'Child' });
    await agent.post('/api/nodes').send({ tree_id: tree.id, parent_id: child.id, label: 'Grandchild' });

    const del = await agent.delete(`/api/nodes/${root.id}`);
    expect(del.status).toBe(200);
    expect(del.body.deleted).toHaveLength(3);

    const remaining = await agent.get(`/api/nodes/children?tree_id=${tree.id}`);
    expect(remaining.body).toHaveLength(0);
  });

  it('restores a deleted subtree with original ids and relationships intact', async () => {
    const tree = await createTree();
    const { body: root } = await agent.post('/api/nodes').send({ tree_id: tree.id, label: 'Root' });
    const { body: child } = await agent.post('/api/nodes').send({ tree_id: tree.id, parent_id: root.id, label: 'Child' });

    const del = await agent.delete(`/api/nodes/${root.id}`);
    expect(del.body.deleted).toHaveLength(2);

    const restore = await agent.post('/api/nodes/restore').send({ nodes: del.body.deleted });
    expect(restore.status).toBe(201);
    expect(restore.body).toHaveLength(2);

    const restoredChild = await agent.get(`/api/nodes/${child.id}`);
    expect(restoredChild.status).toBe(200);
    expect(restoredChild.body.parent_id).toBe(root.id);
  });
});

describe('batch node creation (templates)', () => {
  it('creates all children in one call', async () => {
    const tree = await createTree();
    const { body: root } = await agent.post('/api/nodes').send({ tree_id: tree.id, label: 'Root' });

    const res = await agent.post('/api/nodes/batch').send({
      tree_id: tree.id,
      parent_id: root.id,
      nodes: [{ label: '2023' }, { label: '2024' }, { label: '2025' }]
    });
    expect(res.status).toBe(201);
    expect(res.body).toHaveLength(3);

    const children = await agent.get(`/api/nodes/children?tree_id=${tree.id}&parent_id=${root.id}`);
    expect(children.body.map(n => n.label)).toEqual(['2023', '2024', '2025']);
  });

  it('rejects a batch where one node is missing a label', async () => {
    const tree = await createTree();
    const res = await agent.post('/api/nodes/batch').send({
      tree_id: tree.id,
      nodes: [{ label: 'Fine' }, { label: '' }]
    });
    expect(res.status).toBe(400);

    // nothing should have been committed
    const children = await agent.get(`/api/nodes/children?tree_id=${tree.id}`);
    expect(children.body).toHaveLength(0);
  });
});

describe('tree/node routes require auth', () => {
  it('rejects an unauthenticated tree creation', async () => {
    const res = await request(app).post('/api/trees').send({ name: 'Nope' });
    expect(res.status).toBe(401);
  });
});
