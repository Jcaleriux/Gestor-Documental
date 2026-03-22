const fs = require('fs');
const path = require('path');
const pool = require('./index');
const { applyPendingMigrations } = require('./migrationManager');

async function runSqlFile(sqlPath, label) {
  const sql = fs.readFileSync(sqlPath, 'utf8');
  await pool.query(sql);
  console.log(`Script ${label} ejecutado`);
}

async function resetSchema() {
  try {
    console.log('Reseteando schema public...');
    await pool.query('DROP SCHEMA IF EXISTS public CASCADE;');
    await pool.query('CREATE SCHEMA public;');

    const dbDir = path.join(__dirname, 'database');
    const initPath = path.join(dbDir, '00_init.sql');
    const seedPath = path.join(dbDir, 'seed.sql');

    if (!fs.existsSync(initPath)) {
      throw new Error('No se encontro backend/db/database/00_init.sql');
    }

    await runSqlFile(initPath, '00_init.sql');
    if (fs.existsSync(seedPath)) {
      await runSqlFile(seedPath, 'seed.sql');
    }
    await applyPendingMigrations(pool, { logger: console });

    console.log('Base de datos reconstruida desde cero.');
  } catch (error) {
    console.error('Error:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

resetSchema();
