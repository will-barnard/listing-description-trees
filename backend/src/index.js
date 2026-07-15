const { migrate } = require('./db');
const createApp = require('./app');

const PORT = process.env.PORT || 3001;
const app = createApp();

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
