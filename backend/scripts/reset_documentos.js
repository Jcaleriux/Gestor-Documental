const pool = require("../db");

async function main() {
  try {
    await pool.query(`
      DO $$
      DECLARE
        tbls text;
      BEGIN
        SELECT string_agg(format('%I', table_name), ', ') INTO tbls
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name IN (
            'facturas',
            'notas_credito',
            'mensajes_hacienda',
            'tiquetes_electronicos',
            'facturas_contabilizacion',
            'comentarios_documento',
            'tramites_pago',
            'tramites_pago_documentos',
            'tramites_pago_historial',
            'versiones_documento'
          );

        IF tbls IS NOT NULL THEN
          EXECUTE 'TRUNCATE TABLE ' || tbls || ' RESTART IDENTITY CASCADE';
        END IF;
      END $$;
    `);

    console.log("Limpieza completa de documentos (tablas truncadas).");
  } catch (err) {
    console.error("Error limpiando documentos:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main();
}
