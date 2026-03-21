const pool = require('./index');
const { getMigrationStatus } = require('./migrationManager');

async function run() {
  try {
    const status = await getMigrationStatus(pool);

    console.log(`Tabla schema_migrations: ${status.migrationTableExists ? 'si' : 'no'}`);
    console.log(`Tablas runtime detectadas: ${status.publicTableCount}`);
    console.log(`Schema runtime reconocible: ${status.bootstrappedSchema ? 'si' : 'no'}`);
    console.log(`Migraciones registradas: ${status.trackedMigrations.length}`);
    console.log(`Migraciones pendientes: ${status.pendingMigrations.length}`);

    if (status.pendingMigrations.length > 0) {
      console.log(
        `Pendientes: ${status.pendingMigrations
          .map((migration) => `${migration.version} ${migration.name}`)
          .join(', ')}`
      );
    }

    if (status.missingFiles.length > 0) {
      console.log(
        `Migraciones registradas sin archivo: ${status.missingFiles
          .map((migration) => migration.version)
          .join(', ')}`
      );
      process.exitCode = 1;
    }

    if (status.checksumMismatches.length > 0) {
      console.log(
        `Migraciones con checksum distinto: ${status.checksumMismatches
          .map((migration) => migration.version)
          .join(', ')}`
      );
      process.exitCode = 1;
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();
