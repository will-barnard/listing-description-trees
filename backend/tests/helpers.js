// Imported only after setupEnv.js has set process.env, so these picks up
// the test DB config / JWT_SECRET.
const { pool, migrate } = require('../src/db');
const createApp = require('../src/app');

async function resetDb() {
  await pool.query('TRUNCATE TABLE nodes, trees, node_templates, users RESTART IDENTITY CASCADE');
}

module.exports = { pool, migrate, createApp, resetDb };
