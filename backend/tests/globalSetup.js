const { Client } = require('pg');
const cfg = require('./testDbConfig');

// Runs once, in its own process, before any test file. Connects to the
// default "postgres" database as an admin and creates the test database if
// it doesn't already exist yet. Requires a reachable Postgres server (e.g.
// `docker compose -f docker-compose.dev.yml up postgres`).
module.exports = async () => {
  const admin = new Client({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: 'postgres'
  });

  try {
    await admin.connect();
  } catch (err) {
    console.error(
      `\nCould not reach Postgres at ${cfg.host}:${cfg.port}. Start it first, e.g.:\n` +
      `  docker compose -f docker-compose.dev.yml up -d postgres\n`
    );
    throw err;
  }

  try {
    await admin.query(`CREATE DATABASE "${cfg.database}"`);
  } catch (err) {
    if (err.code !== '42P04') throw err; // 42P04 = database already exists
  } finally {
    await admin.end();
  }
};
