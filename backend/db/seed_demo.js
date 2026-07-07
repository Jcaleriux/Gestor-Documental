const fs = require('fs');
const path = require('path');
const pool = require('./index');

async function seedDemo() {
  try {
    const sqlPath = path.join(__dirname, 'database', 'demo_seed.sql');

    if (!fs.existsSync(sqlPath)) {
      throw new Error('No se encontro backend/db/database/demo_seed.sql');
    }

    const sql = fs.readFileSync(sqlPath, 'utf8');
    await pool.query(sql);
    console.log('Seed demo ejecutado');
  } catch (error) {
    console.error('Error:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  seedDemo();
}

module.exports = {
  seedDemo,
};
