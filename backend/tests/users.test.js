const request = require('supertest');
const { pool, migrate, createApp, resetDb } = require('./helpers');

const app = createApp();

const ADMIN = { email: 'admin@example.com', username: 'admin', password: 'correcthorse123' };
const MEMBER = { email: 'member@example.com', username: 'member', password: 'memberpassword1', role: 'user' };

async function registerAdmin() {
  const agent = request.agent(app);
  await agent.post('/api/auth/register').send(ADMIN);
  return agent;
}

beforeAll(async () => {
  await migrate();
});

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await pool.end();
});

describe('admin-only access', () => {
  it('rejects a non-admin user', async () => {
    const adminAgent = await registerAdmin();
    await adminAgent.post('/api/users').send(MEMBER);

    const memberAgent = request.agent(app);
    await memberAgent.post('/api/auth/login').send({ identifier: MEMBER.username, password: MEMBER.password });

    const res = await memberAgent.get('/api/users');
    expect(res.status).toBe(403);
  });

  it('rejects an unauthenticated request', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/users (admin creates an account)', () => {
  it('creates a user visible in the list', async () => {
    const adminAgent = await registerAdmin();
    const create = await adminAgent.post('/api/users').send(MEMBER);
    expect(create.status).toBe(201);
    expect(create.body).toMatchObject({ email: MEMBER.email, username: MEMBER.username, role: 'user' });
    expect(create.body.password_hash).toBeUndefined();

    const list = await adminAgent.get('/api/users');
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(2); // admin + member
    expect(list.body.map(u => u.username)).toEqual(expect.arrayContaining(['admin', 'member']));
  });

  it('lets the new account log in immediately', async () => {
    const adminAgent = await registerAdmin();
    await adminAgent.post('/api/users').send(MEMBER);

    const login = await request(app).post('/api/auth/login').send({
      identifier: MEMBER.email,
      password: MEMBER.password
    });
    expect(login.status).toBe(200);
    expect(login.body.user.role).toBe('user');
  });

  it('rejects a duplicate email', async () => {
    const adminAgent = await registerAdmin();
    await adminAgent.post('/api/users').send(MEMBER);
    const res = await adminAgent.post('/api/users').send({ ...MEMBER, username: 'someoneelse' });
    expect(res.status).toBe(409);
  });

  it('rejects a weak password', async () => {
    const adminAgent = await registerAdmin();
    const res = await adminAgent.post('/api/users').send({ ...MEMBER, password: 'short' });
    expect(res.status).toBe(400);
  });
});

describe('PUT /api/users/:id/role', () => {
  it('promotes a user to admin', async () => {
    const adminAgent = await registerAdmin();
    const { body: member } = await adminAgent.post('/api/users').send(MEMBER);

    const res = await adminAgent.put(`/api/users/${member.id}/role`).send({ role: 'admin' });
    expect(res.status).toBe(200);
    expect(res.body.role).toBe('admin');
  });

  it('refuses to let an admin demote themselves', async () => {
    const adminAgent = await registerAdmin();
    const me = await adminAgent.get('/api/me');

    const res = await adminAgent.put(`/api/users/${me.body.id}/role`).send({ role: 'user' });
    expect(res.status).toBe(400);
  });

  it('allows demoting a co-admin as long as another admin remains', async () => {
    const adminAgent = await registerAdmin();
    const { body: member } = await adminAgent.post('/api/users').send(MEMBER);
    await adminAgent.put(`/api/users/${member.id}/role`).send({ role: 'admin' });

    // two admins now exist — demoting the other one (not self) is fine
    const res = await adminAgent.put(`/api/users/${member.id}/role`).send({ role: 'user' });
    expect(res.status).toBe(200);
    expect(res.body.role).toBe('user');
  });
});

describe('DELETE /api/users/:id', () => {
  it('deletes a user', async () => {
    const adminAgent = await registerAdmin();
    const { body: member } = await adminAgent.post('/api/users').send(MEMBER);

    const res = await adminAgent.delete(`/api/users/${member.id}`);
    expect(res.status).toBe(200);

    const list = await adminAgent.get('/api/users');
    expect(list.body).toHaveLength(1);
  });

  it('refuses to delete yourself', async () => {
    const adminAgent = await registerAdmin();
    const me = await adminAgent.get('/api/me');

    const res = await adminAgent.delete(`/api/users/${me.body.id}`);
    expect(res.status).toBe(400);
  });

  it('allows deleting a co-admin as long as another admin remains', async () => {
    const adminAgent = await registerAdmin();
    const { body: member } = await adminAgent.post('/api/users').send(MEMBER);
    await adminAgent.put(`/api/users/${member.id}/role`).send({ role: 'admin' });

    const res = await adminAgent.delete(`/api/users/${member.id}`);
    expect(res.status).toBe(200);
  });
});
