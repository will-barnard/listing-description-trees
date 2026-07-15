const request = require('supertest');
const jwt = require('jsonwebtoken');
const { pool, migrate, createApp, resetDb } = require('./helpers');

const app = createApp();

const ADMIN = { email: 'admin@example.com', username: 'admin', password: 'correcthorse123' };

beforeAll(async () => {
  await migrate();
});

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await pool.end();
});

describe('GET /api/auth/status', () => {
  it('reports no users before anyone registers', async () => {
    const res = await request(app).get('/api/auth/status');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ hasUsers: false });
  });

  it('reports users once the first account exists', async () => {
    await request(app).post('/api/auth/register').send(ADMIN);
    const res = await request(app).get('/api/auth/status');
    expect(res.body).toEqual({ hasUsers: true });
  });
});

describe('POST /api/auth/register', () => {
  it('makes the first registrant an admin and sets a session cookie', async () => {
    const res = await request(app).post('/api/auth/register').send(ADMIN);
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({
      email: ADMIN.email,
      username: ADMIN.username,
      role: 'admin'
    });
    expect(res.headers['set-cookie']).toBeDefined();
    expect(res.headers['set-cookie'][0]).toMatch(/auth_token=/);
  });

  it('rejects a second registration once an account exists', async () => {
    await request(app).post('/api/auth/register').send(ADMIN);
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'someone@else.com', username: 'someoneelse', password: 'anotherpassword' });
    expect(res.status).toBe(403);
  });

  it('rejects an invalid email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...ADMIN, email: 'not-an-email' });
    expect(res.status).toBe(400);
  });

  it('rejects a short password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...ADMIN, password: 'short' });
    expect(res.status).toBe(400);
  });

});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/api/auth/register').send(ADMIN);
  });

  it('logs in with the email', async () => {
    const res = await request(app).post('/api/auth/login').send({
      identifier: ADMIN.email,
      password: ADMIN.password
    });
    expect(res.status).toBe(200);
    expect(res.body.user.username).toBe(ADMIN.username);
  });

  it('logs in with the username', async () => {
    const res = await request(app).post('/api/auth/login').send({
      identifier: ADMIN.username,
      password: ADMIN.password
    });
    expect(res.status).toBe(200);
  });

  it('rejects a wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({
      identifier: ADMIN.username,
      password: 'wrong-password'
    });
    expect(res.status).toBe(401);
  });

  it('rejects an unknown identifier', async () => {
    const res = await request(app).post('/api/auth/login').send({
      identifier: 'nobody',
      password: ADMIN.password
    });
    expect(res.status).toBe(401);
  });
});

describe('session enforcement', () => {
  it('rejects /api/me with no cookie', async () => {
    const res = await request(app).get('/api/me');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('NOT_AUTHENTICATED');
  });

  it('rejects protected app routes with no cookie', async () => {
    const res = await request(app).get('/api/trees');
    expect(res.status).toBe(401);
  });

  it('allows /api/me with a valid session cookie', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/register').send(ADMIN);
    const res = await agent.get('/api/me');
    expect(res.status).toBe(200);
    expect(res.body.username).toBe(ADMIN.username);
  });

  it('flags an expired token distinctly and clears the cookie', async () => {
    await request(app).post('/api/auth/register').send(ADMIN);

    const expiredToken = jwt.sign(
      { sub: 1, email: ADMIN.email, username: ADMIN.username, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '-10s', issuer: 'listing-description-trees' }
    );

    const res = await request(app)
      .get('/api/me')
      .set('Cookie', [`auth_token=${expiredToken}`]);

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('TOKEN_EXPIRED');
    expect(res.headers['set-cookie'][0]).toMatch(/auth_token=;/);
  });

  it('rejects a token signed with the wrong secret', async () => {
    const forged = jwt.sign(
      { sub: 1, email: 'x@x.com', username: 'x', role: 'admin' },
      'not-the-real-secret',
      { expiresIn: '1h', issuer: 'listing-description-trees' }
    );
    const res = await request(app).get('/api/me').set('Cookie', [`auth_token=${forged}`]);
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_TOKEN');
  });

  it('logout clears the session', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/register').send(ADMIN);
    expect((await agent.get('/api/me')).status).toBe(200);

    await agent.post('/api/auth/logout');
    const res = await agent.get('/api/me');
    expect(res.status).toBe(401);
  });
});
