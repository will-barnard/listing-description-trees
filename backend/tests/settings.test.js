const request = require('supertest');
const { pool, migrate, createApp, resetDb } = require('./helpers');

const app = createApp();

const ADMIN = { email: 'admin@example.com', username: 'admin', password: 'correcthorse123' };
const MEMBER = { email: 'member@example.com', username: 'member', password: 'memberpassword1', role: 'user' };

let adminAgent;

beforeAll(async () => {
  await migrate();
});

beforeEach(async () => {
  await resetDb();
  adminAgent = request.agent(app);
  await adminAgent.post('/api/auth/register').send(ADMIN);
});

afterAll(async () => {
  await pool.end();
});

describe('GET /api/settings', () => {
  it('defaults to "Your Trees"', async () => {
    const res = await adminAgent.get('/api/settings');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ orgName: 'Your Trees' });
  });

  it('is readable by a non-admin member', async () => {
    await adminAgent.post('/api/users').send(MEMBER);
    const memberAgent = request.agent(app);
    await memberAgent.post('/api/auth/login').send({ identifier: MEMBER.username, password: MEMBER.password });

    const res = await memberAgent.get('/api/settings');
    expect(res.status).toBe(200);
  });

  it('rejects an unauthenticated request', async () => {
    const res = await request(app).get('/api/settings');
    expect(res.status).toBe(401);
  });
});

describe('PUT /api/settings', () => {
  it('lets an admin update the org name', async () => {
    const res = await adminAgent.put('/api/settings').send({ orgName: 'Acme Motors' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ orgName: 'Acme Motors' });

    const check = await adminAgent.get('/api/settings');
    expect(check.body.orgName).toBe('Acme Motors');
  });

  it('rejects a non-admin', async () => {
    await adminAgent.post('/api/users').send(MEMBER);
    const memberAgent = request.agent(app);
    await memberAgent.post('/api/auth/login').send({ identifier: MEMBER.username, password: MEMBER.password });

    const res = await memberAgent.put('/api/settings').send({ orgName: 'Nope Inc' });
    expect(res.status).toBe(403);
  });

  it('rejects an empty org name', async () => {
    const res = await adminAgent.put('/api/settings').send({ orgName: '   ' });
    expect(res.status).toBe(400);
  });
});
