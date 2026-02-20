const app = require('./app');

const PORT = process.env.PORT || 3002;

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
