// Shared by globalSetup (its own process, no access to setupEnv.js) and
// setupEnv.js (runs inside each test worker). Override any of these with
// TEST_DB_* env vars if you're not using the docker-compose.dev.yml postgres
// service on localhost:5432.
module.exports = {
  host: process.env.TEST_DB_HOST || 'localhost',
  port: parseInt(process.env.TEST_DB_PORT || '5432'),
  database: process.env.TEST_DB_NAME || 'listing_trees_test',
  user: process.env.TEST_DB_USER || 'postgres',
  password: process.env.TEST_DB_PASSWORD || 'devpassword'
};
