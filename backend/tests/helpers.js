// Imported only after setupEnv.js has set process.env, so these picks up
// the test DB config / JWT_SECRET.
const { pool, migrate } = require('../src/db');
const createApp = require('../src/app');

async function resetDb() {
  await pool.query('TRUNCATE TABLE nodes, trees, node_templates, users RESTART IDENTITY CASCADE');
  // app_settings is a singleton row, not truncated above — reset it explicitly
  // so settings/restoration-disclaimer tests don't depend on run order.
  await pool.query("UPDATE app_settings SET org_name = 'Your Trees', restoration_disclaimer = '' WHERE id = 1");
}

module.exports = { pool, migrate, createApp, resetDb };
