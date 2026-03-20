const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const { pool, migrate } = require('./db');
const authMiddleware = require('./middleware/auth');
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

// Public config (no auth required) — frontend needs the auth URL
app.get('/api/config', (req, res) => {
  res.json({
    authDisabled: process.env.AUTH_DISABLED === 'true',
    authLoginUrl: (process.env.AUTH_ISSUER || '') + '/login'
  });
});

// Auth middleware for all /api routes except health
app.use('/api/trees', authMiddleware, treesRouter);
app.use('/api/nodes', authMiddleware, nodesRouter);
app.use('/api/templates', authMiddleware, templatesRouter);
app.get('/api/me', authMiddleware, (req, res) => {
  res.json(req.user);
});

async function start() {
  await migrate();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend listening on port ${PORT}`);
  });
}

start().catch(err => {
  console.error('Failed to start:', err);
  process.exit(1);
});
