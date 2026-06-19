const pool = require("../db");
const { upsertProveedorDesdeEmisor } = require("../services/proveedor.service");

async function obtenerEmisoresExistentes() {
  const result = await pool.query(
    `SELECT sociedad_id, emisor
     FROM facturas
     WHERE emisor IS NOT NULL AND sociedad_id IS NOT NULL
     UNION ALL
     SELECT sociedad_id, emisor
     FROM tiquetes_electronicos
     WHERE emisor IS NOT NULL AND sociedad_id IS NOT NULL
     UNION ALL
     SELECT sociedad_id, xml_completo->'Emisor' AS emisor
     FROM notas_credito
     WHERE xml_completo ? 'Emisor' AND sociedad_id IS NOT NULL`
  );

  return result.rows
    .filter((row) => row?.emisor && row?.sociedad_id != null)
    .map((row) => ({
      sociedadId: Number(row.sociedad_id),
      emisor: row.emisor
    }))
    .filter((row) => Number.isInteger(row.sociedadId) && row.sociedadId > 0);
}

async function main() {
  try {
    const emisores = await obtenerEmisoresExistentes();

    let totalLeidos = 0;
    let totalUpsert = 0;
    let totalSinCambios = 0;
    let totalOmitidos = 0;

    for (const item of emisores) {
      totalLeidos += 1;
      const respuesta = await upsertProveedorDesdeEmisor(item.emisor, item.sociedadId, {
        origen: "backfill_proveedores"
      });
      if (respuesta.status === "upserted") {
        totalUpsert += 1;
      } else if (respuesta.status === "unchanged") {
        totalSinCambios += 1;
      } else {
        totalOmitidos += 1;
      }
    }

    const totalProveedores = await pool.query(
      "SELECT COUNT(*)::int AS total FROM proveedores"
    );

    console.log(`Emisores leidos: ${totalLeidos}`);
    console.log(`Registros upsertados: ${totalUpsert}`);
    console.log(`Registros sin cambios: ${totalSinCambios}`);
    console.log(`Emisores omitidos: ${totalOmitidos}`);
    console.log(`Proveedores unicos en tabla (por sociedad): ${totalProveedores.rows[0].total}`);
  } catch (error) {
    console.error("Error al ejecutar backfill de proveedores:", error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main();
}
