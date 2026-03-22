const app = require('./app');
const { runtimeConfig } = require('./config/runtime');

// Start server
if (require.main === module) {
  app.listen(runtimeConfig.port, () => {
    console.log(`Server running on port ${runtimeConfig.port}`);
  });
}

module.exports = app;
