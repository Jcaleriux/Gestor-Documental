const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'novogar_db',
  user: 'postgres',
  password: 'admin'
});

async function queryDB() {
  try {
    await client.connect();
    console.log('Connected to database');

    const tableExists = async (tableName) => {
      const res = await client.query(
        `
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_name = $1
        ) AS exists
        `,
        [tableName]
      );
      return res.rows[0].exists;
    };

    // Count facturas
    const facturasResult = await client.query('SELECT COUNT(*) as total FROM facturas');
    console.log(`Total facturas: ${facturasResult.rows[0].total}`);

    // Count notas_credito
    const notasResult = await client.query('SELECT COUNT(*) as total FROM notas_credito');
    console.log(`Total notas de crédito: ${notasResult.rows[0].total}`);

    // Count mensajes_hacienda
    const mensajesResult = await client.query('SELECT COUNT(*) as total FROM mensajes_hacienda');
    console.log(`Total mensajes Hacienda: ${mensajesResult.rows[0].total}`);

    if (await tableExists('tiquetes_electronicos')) {
      const tiquetesResult = await client.query('SELECT COUNT(*) as total FROM tiquetes_electronicos');
      console.log(`Total tiquetes electronicos: ${tiquetesResult.rows[0].total}`);
    }

    // Sample facturas with paths
    const sampleFacturas = await client.query('SELECT clave, ruta_xml, ruta_pdf FROM facturas LIMIT 5');
    console.log('\nSample facturas:');
    sampleFacturas.rows.forEach(row => {
      console.log(`Clave: ${row.clave}, XML: ${row.ruta_xml}, PDF: ${row.ruta_pdf}`);
    });

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

queryDB();
