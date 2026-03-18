const fs = require('fs');
const path = require('path');
const pool = require('./index');

async function main() {
  const sqlPath = path.join(__dirname, 'database', 'legacy', '39_tramites_tesoreria_pagado_backfill.sql');

  if (!fs.existsSync(sqlPath)) {
    throw new Error(`No se encontro el script: ${sqlPath}`);
  }

  const sql = fs.readFileSync(sqlPath, 'utf8');
  await pool.query(sql);
  console.log('Backfill de estado pagado para tesoreria aplicado correctamente.');
}

main()
  .catch((error) => {
    console.error('Error aplicando backfill de estado pagado para tesoreria:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
