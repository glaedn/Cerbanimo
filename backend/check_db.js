import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

async function checkSchema() {
  try {
    const res = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'projects';
    `);
    console.log('Projects table columns:');
    res.rows.forEach(row => console.log(`${row.column_name}: ${row.data_type}`));

    const userRes = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'users';
    `);
    console.log('\nUsers table columns:');
    userRes.rows.forEach(row => console.log(`${row.column_name}: ${row.data_type}`));

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkSchema();
