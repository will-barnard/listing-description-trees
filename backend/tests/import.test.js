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

describe('POST /api/trees/import', () => {
  it('creates a nested tree in one call', async () => {
    const payload = {
      name: 'Rhodes',
      description: 'Rhodes listing templates',
      nodes: [
        { label: '1960\'s Sparkletop', copy: 'Sparkletop copy...' },
        {
          label: 'Rhodes Mark I',
          children: [
            {
              label: 'Late Torrington (1974-1976)',
              children: [
                { label: 'Stage 73', copy: 'Stage 73 copy...' },
                { label: 'Stage 88', copy: 'Stage 88 copy...' }
              ]
            }
          ]
        }
      ]
    };

    const res = await agent.post('/api/trees/import').send(payload);
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Rhodes');
    expect(res.body.nodeCount).toBe(5); // sparkletop + mark I + era + 2 leaves

    const full = await agent.get(`/api/trees/${res.body.id}`);
    expect(full.body.nodes).toHaveLength(5);

    const sparkletop = full.body.nodes.find(n => n.label === "1960's Sparkletop");
    expect(sparkletop.parent_id).toBeNull();
    expect(sparkletop.copy).toBe('Sparkletop copy...');

    const markI = full.body.nodes.find(n => n.label === 'Rhodes Mark I');
    expect(markI.parent_id).toBeNull();

    const era = full.body.nodes.find(n => n.label === 'Late Torrington (1974-1976)');
    expect(era.parent_id).toBe(markI.id);

    const stage73 = full.body.nodes.find(n => n.label === 'Stage 73');
    expect(stage73.parent_id).toBe(era.id);
  });

  it('preserves sibling order from the array', async () => {
    const payload = {
      name: 'Order Test',
      nodes: [{ label: 'First' }, { label: 'Second' }, { label: 'Third' }]
    };
    const res = await agent.post('/api/trees/import').send(payload);
    const full = await agent.get(`/api/trees/${res.body.id}`);
    const labels = full.body.nodes.sort((a, b) => a.sort_order - b.sort_order).map(n => n.label);
    expect(labels).toEqual(['First', 'Second', 'Third']);
  });

  it('rejects a missing name', async () => {
    const res = await agent.post('/api/trees/import').send({ nodes: [] });
    expect(res.status).toBe(400);
  });

  it('rejects a node missing a label', async () => {
    const res = await agent.post('/api/trees/import').send({
      name: 'Bad Tree',
      nodes: [{ copy: 'no label here' }]
    });
    expect(res.status).toBe(400);
  });

  it('rejects a nested child missing a label', async () => {
    const res = await agent.post('/api/trees/import').send({
      name: 'Bad Tree',
      nodes: [{ label: 'Ok', children: [{ copy: 'still no label' }] }]
    });
    expect(res.status).toBe(400);
  });

  it('rolls back the whole tree if any node is invalid', async () => {
    await agent.post('/api/trees/import').send({
      name: 'Should Not Exist',
      nodes: [{ label: 'Fine' }, { label: '' }]
    }).catch(() => {});

    const trees = await agent.get('/api/trees');
    expect(trees.body.find(t => t.name === 'Should Not Exist')).toBeUndefined();
  });

  it('rejects an unauthenticated request', async () => {
    const res = await request(app).post('/api/trees/import').send({ name: 'Nope', nodes: [] });
    expect(res.status).toBe(401);
  });

  it('imports a tree with no nodes at all', async () => {
    const res = await agent.post('/api/trees/import').send({ name: 'Empty Tree' });
    expect(res.status).toBe(201);
    expect(res.body.nodeCount).toBe(0);
  });
});
