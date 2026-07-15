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

describe('node templates CRUD', () => {
  it('creates and lists a template', async () => {
    const create = await agent.post('/api/templates').send({
      name: 'Model Years',
      children: ['2023', '2024', '2025']
    });
    expect(create.status).toBe(201);
    expect(create.body.children).toEqual(['2023', '2024', '2025']);

    const list = await agent.get('/api/templates');
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);
  });

  it('rejects a template with no children', async () => {
    const res = await agent.post('/api/templates').send({ name: 'Empty', children: [] });
    expect(res.status).toBe(400);
  });

  it('updates a template', async () => {
    const { body: tmpl } = await agent.post('/api/templates').send({ name: 'Trims', children: ['Base'] });
    const res = await agent.put(`/api/templates/${tmpl.id}`).send({ name: 'Trims', children: ['Base', 'Sport'] });
    expect(res.status).toBe(200);
    expect(res.body.children).toEqual(['Base', 'Sport']);
  });

  it('deletes a template', async () => {
    const { body: tmpl } = await agent.post('/api/templates').send({ name: 'Trims', children: ['Base'] });
    const res = await agent.delete(`/api/templates/${tmpl.id}`);
    expect(res.status).toBe(200);

    const list = await agent.get('/api/templates');
    expect(list.body).toHaveLength(0);
  });

  it('rejects an unauthenticated request', async () => {
    const res = await request(app).get('/api/templates');
    expect(res.status).toBe(401);
  });
});
