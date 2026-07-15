const cfg = require('./testDbConfig');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-do-not-use-in-prod';
process.env.AUTH_DISABLED = 'false';
process.env.AUTH_COOKIE_NAME = 'auth_token';
process.env.CORS_ORIGIN = 'http://localhost:5173';

process.env.DB_HOST = cfg.host;
process.env.DB_PORT = String(cfg.port);
process.env.DB_NAME = cfg.database;
process.env.DB_USER = cfg.user;
process.env.DB_PASSWORD = cfg.password;
