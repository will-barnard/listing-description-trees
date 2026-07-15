const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'listing_trees',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
});

const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS trees (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_by VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nodes (
  id SERIAL PRIMARY KEY,
  tree_id INTEGER NOT NULL REFERENCES trees(id) ON DELETE CASCADE,
  parent_id INTEGER REFERENCES nodes(id) ON DELETE CASCADE,
  label VARCHAR(255) NOT NULL,
  copy TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nodes_tree_id ON nodes(tree_id);
CREATE INDEX IF NOT EXISTS idx_nodes_parent_id ON nodes(parent_id);

CREATE TABLE IF NOT EXISTS node_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  children JSONB NOT NULL DEFAULT '[]',
  created_by VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Single-row table of app-wide settings editable by admins (e.g. the
-- organization name shown on the home page).
CREATE TABLE IF NOT EXISTS app_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  org_name VARCHAR(255) NOT NULL DEFAULT 'Your Trees',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO app_settings (id, org_name)
VALUES (1, 'Your Trees')
ON CONFLICT (id) DO NOTHING;
`;

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(MIGRATION_SQL);
    console.log('Database migration complete');
  } finally {
    client.release();
  }
}

module.exports = { pool, migrate };
