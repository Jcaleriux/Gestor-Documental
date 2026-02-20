const fs = require('fs');
const path = require('path');
const pool = require('./index');

async function main() {
  const sqlPath = path.join(__dirname, 'database', 'legacy', '30_tramites_retenciones.sql');

  if (!fs.existsSync(sqlPath)) {
    throw new Error(`No se encontro el script: ${sqlPath}`);
  }

  const sql = fs.readFileSync(sqlPath, 'utf8');
  await pool.query(sql);
  console.log('Migracion de tramites con retenciones aplicada correctamente.');
}

main()
  .catch((error) => {
    console.error('Error aplicando migracion de tramites con retenciones:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
