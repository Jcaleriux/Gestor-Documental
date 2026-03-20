const pool = require('./index');
const fs = require('fs');
const path = require('path');

async function runSqlFile(sqlPath, label) {
  const sql = fs.readFileSync(sqlPath, 'utf8');
  await pool.query(sql);
  console.log(`Script ${label} ejecutado`);
}

async function createTables() {
  try {
    console.log('Ejecutando scripts de base de datos...');

    const dbDir = path.join(__dirname, 'database');
    const initPath = path.join(dbDir, '00_init.sql');
    const seedPath = path.join(dbDir, 'seed.sql');

    if (!fs.existsSync(initPath)) {
      throw new Error('No se encontro backend/db/database/00_init.sql');
    }

    const existingTables = await pool.query(`
      SELECT COUNT(*)::int AS total
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
    `);

    if (existingTables.rows[0].total > 0) {
      console.log('El schema public ya tiene tablas. Usa "npm run db:reset" para reconstruir desde cero.');
      await pool.end();
      return;
    }

    await runSqlFile(initPath, '00_init.sql');
    if (fs.existsSync(seedPath)) {
      await runSqlFile(seedPath, 'seed.sql');
    }

    const result = await pool.query(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename IN (
        'comentarios_documento',
        'versiones_documento',
        'auditoria',
        'facturas',
        'facturas_estado_documental_historial',
        'facturas_workflow_pago_historial',
        'facturas_estado_mixto_historial',
        'sociedades'
      )
    `);

    console.log(`Tablas verificadas: ${result.rows.map(r => r.tablename).join(', ')}`);

    const colResult = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'facturas' AND column_name = 'estado'
    `);

    if (colResult.rows.length > 0) {
      console.log('Columna estado existe en facturas');
    } else {
      console.log('Columna estado no encontrada en facturas');
    }

    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

createTables();
