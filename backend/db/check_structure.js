const pool = require('./index');

async function getTableStructure() {
  try {
    const tablesResult = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    console.log('\n========== ESTRUCTURA DE TABLAS ==========\n');

    for (const table of tablesResult.rows) {
      const tableName = table.table_name;
      console.log(`\nTABLA: ${tableName.toUpperCase()}`);
      console.log('-'.repeat(80));

      const columnsResult = await pool.query(
        `
          SELECT
            column_name,
            data_type,
            is_nullable,
            column_default
          FROM information_schema.columns
          WHERE table_name = $1
          ORDER BY ordinal_position
        `,
        [tableName]
      );

      console.log('\nColumnas:');
      columnsResult.rows.forEach((col, index) => {
        const nullable = col.is_nullable === 'YES' ? '(nullable)' : '(NOT NULL)';
        const defaultValue = col.column_default ? ` DEFAULT ${col.column_default}` : '';
        console.log(
          `  ${index + 1}. ${col.column_name}: ${col.data_type} ${nullable}${defaultValue}`
        );
      });

      const constraintsResult = await pool.query(
        `
          SELECT
            constraint_name,
            constraint_type
          FROM information_schema.table_constraints
          WHERE table_name = $1
        `,
        [tableName]
      );

      if (constraintsResult.rows.length > 0) {
        console.log('\nConstraints:');
        constraintsResult.rows.forEach((constraint) => {
          console.log(`  - ${constraint.constraint_name}: ${constraint.constraint_type}`);
        });
      }

      const indexesResult = await pool.query(
        `
          SELECT
            indexname,
            indexdef
          FROM pg_indexes
          WHERE tablename = $1
        `,
        [tableName]
      );

      if (indexesResult.rows.length > 0) {
        console.log('\nIndices:');
        indexesResult.rows.forEach((idx) => {
          console.log(`  - ${idx.indexname}`);
        });
      }
    }

    console.log(`\n${'='.repeat(80)}`);
    console.log(`\nTotal de tablas: ${tablesResult.rows.length}`);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

getTableStructure();
