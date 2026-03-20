const fs = require('fs');
const path = require('path');
const pool = require('./index');

async function main() {
  const sqlPath = path.join(__dirname, 'database', 'legacy', '43_facturas_estado_historiales.sql');

  if (!fs.existsSync(sqlPath)) {
    throw new Error(`No se encontro el script: ${sqlPath}`);
  }

  const sql = fs.readFileSync(sqlPath, 'utf8');
  await pool.query(sql);
  console.log('Migracion de historiales dedicados de factura aplicada correctamente.');
}

main()
  .catch((error) => {
    console.error('Error aplicando migracion de historiales dedicados de factura:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
