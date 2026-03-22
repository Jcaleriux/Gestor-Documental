const pool = require('./index');
const { applyPendingMigrations } = require('./migrationManager');

async function run() {
  try {
    const result = await applyPendingMigrations(pool, { logger: console });

    if (result.appliedNow.length === 0) {
      console.log('No hay migraciones pendientes.');
    } else {
      console.log(`Migraciones aplicadas en esta ejecucion: ${result.appliedNow.length}`);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();
