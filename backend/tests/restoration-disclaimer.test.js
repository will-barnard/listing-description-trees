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

describe('GET /api/restoration-disclaimer', () => {
  it('defaults to an empty string', async () => {
    const res = await adminAgent.get('/api/restoration-disclaimer');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ restorationDisclaimer: '' });
  });

  it('is readable by a non-admin member', async () => {
    await adminAgent.post('/api/users').send(MEMBER);
    const memberAgent = request.agent(app);
    await memberAgent.post('/api/auth/login').send({ identifier: MEMBER.username, password: MEMBER.password });

    const res = await memberAgent.get('/api/restoration-disclaimer');
    expect(res.status).toBe(200);
  });

  it('rejects an unauthenticated request', async () => {
    const res = await request(app).get('/api/restoration-disclaimer');
    expect(res.status).toBe(401);
  });
});

describe('PUT /api/restoration-disclaimer', () => {
  it('lets an admin update the disclaimer', async () => {
    const text = 'This listing is a deposit to reserve the instrument while it is restored.';
    const res = await adminAgent.put('/api/restoration-disclaimer').send({ restorationDisclaimer: text });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ restorationDisclaimer: text });

    const check = await adminAgent.get('/api/restoration-disclaimer');
    expect(check.body.restorationDisclaimer).toBe(text);
  });

  it('also lets a non-admin member update it — this is listing copy, not an admin setting', async () => {
    await adminAgent.post('/api/users').send(MEMBER);
    const memberAgent = request.agent(app);
    await memberAgent.post('/api/auth/login').send({ identifier: MEMBER.username, password: MEMBER.password });

    const res = await memberAgent.put('/api/restoration-disclaimer').send({ restorationDisclaimer: 'Member edit' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ restorationDisclaimer: 'Member edit' });
  });

  it('allows clearing it back to an empty string', async () => {
    await adminAgent.put('/api/restoration-disclaimer').send({ restorationDisclaimer: 'Something' });
    const res = await adminAgent.put('/api/restoration-disclaimer').send({ restorationDisclaimer: '' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ restorationDisclaimer: '' });
  });

  it('rejects a missing/non-string body', async () => {
    const res = await adminAgent.put('/api/restoration-disclaimer').send({});
    expect(res.status).toBe(400);
  });

  it('rejects text over the length limit', async () => {
    const res = await adminAgent.put('/api/restoration-disclaimer').send({ restorationDisclaimer: 'x'.repeat(20001) });
    expect(res.status).toBe(400);
  });

  it('rejects an unauthenticated request', async () => {
    const res = await request(app).put('/api/restoration-disclaimer').send({ restorationDisclaimer: 'nope' });
    expect(res.status).toBe(401);
  });
});
