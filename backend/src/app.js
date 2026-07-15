const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const authMiddleware = require('./middleware/auth');
const { adminOnly } = require('./middleware/auth');
const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');
const treesRouter = require('./routes/trees');
const nodesRouter = require('./routes/nodes');
const templatesRouter = require('./routes/templates');

function createApp() {
  const app = express();

  app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true
  }));
  app.use(express.json());
  app.use(cookieParser());

  // Health check
  app.get('/api/health', (req, res) => res.json({ ok: true }));

  // Public config (no auth required) — frontend needs to know whether auth is
  // disabled for local dev before it can decide whether to show login screens
  app.get('/api/config', (req, res) => {
    res.json({
      authDisabled: process.env.AUTH_DISABLED === 'true'
    });
  });

  // Auth routes: /status and /register (bootstrap-only) and /login are public,
  // everything else in this app requires a valid session.
  app.use('/api/auth', authRouter);
  app.get('/api/me', authMiddleware, (req, res) => {
    res.json(req.user);
  });

  // The whole app lives behind auth from here down.
  app.use('/api/users', authMiddleware, adminOnly, usersRouter);
  app.use('/api/trees', authMiddleware, treesRouter);
  app.use('/api/nodes', authMiddleware, nodesRouter);
  app.use('/api/templates', authMiddleware, templatesRouter);

  return app;
}

module.exports = createApp;
