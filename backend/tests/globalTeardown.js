module.exports = async () => {
  // Nothing to tear down globally — each test file closes its own pool.
  // Left as a no-op hook in case we want to drop the test DB later.
};
