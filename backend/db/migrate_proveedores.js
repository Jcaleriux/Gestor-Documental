const fs = require("fs");
const path = require("path");
const pool = require("./index");

async function runSqlFile(sqlPath) {
  if (!fs.existsSync(sqlPath)) {
    throw new Error(`No se encontro ${sqlPath.replace(/\\/g, "/")}`);
  }

  const sql = fs.readFileSync(sqlPath, "utf8");
  await pool.query(sql);
}

async function main() {
  const sqlPath25 = path.join(__dirname, "database", "legacy", "25_add_proveedores.sql");
  const sqlPath26 = path.join(__dirname, "database", "legacy", "26_proveedores_por_sociedad_tablas_pago.sql");

  try {
    await runSqlFile(sqlPath25);
    console.log("Migracion 25_add_proveedores.sql ejecutada.");
    await runSqlFile(sqlPath26);
    console.log("Migracion 26_proveedores_por_sociedad_tablas_pago.sql ejecutada.");
  } catch (error) {
    console.error("Error al ejecutar migracion de proveedores:", error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
