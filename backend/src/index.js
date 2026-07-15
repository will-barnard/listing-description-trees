const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const { pool, migrate } = require('./db');
const authMiddleware = require('./middleware/auth');
const { adminOnly } = require('./middleware/auth');
const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');
const treesRouter = require('./routes/trees');
const nodesRouter = require('./routes/nodes');
const templatesRouter = require('./routes/templates');

const app = express();
const PORT = process.env.PORT || 3001;

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

async function start() {
  const MAX_RETRIES = 10;
  const RETRY_DELAY_MS = 3000;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await migrate();
      break;
    } catch (err) {
      if (attempt === MAX_RETRIES) {
        console.error('Could not connect to database after retries:', err);
        process.exit(1);
      }
      console.warn(`DB not ready (attempt ${attempt}/${MAX_RETRIES}), retrying in ${RETRY_DELAY_MS}ms…`);
      await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
    }
  }
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend listening on port ${PORT}`);
  });
}

start().catch(err => {
  console.error('Failed to start:', err);
  process.exit(1);
});
