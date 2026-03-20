const { migrate } = require('./index');

migrate()
  .then(() => {
    console.log('Migration successful');
    process.exit(0);
  })
  .catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
