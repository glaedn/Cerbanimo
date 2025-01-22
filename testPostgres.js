const { Pool } = require('pg');
const { createProjectTable } = require('./models/project');
const { createTaskTable } = require('./models/task');

// PostgreSQL connection
const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

pool.query('SELECT 1 + 1 AS result', (err, res) => {
    if (err) {
      console.error('Connection Test Error:', err);
    } else {
      console.log('PostgreSQL Connection Successful:', res.rows);
    }
  });

const testPostgres = async () => {
  try {
    // Initialize schemas
    await createProjectTable();
    await createTaskTable();

    // Insert a project
    const projectResult = await pool.query(
      `INSERT INTO projects (name, description, user_ids, creator_id, tags)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      ['Project A', 'A sample project', [1, 2, 3], 1, ['#tech', '#collaboration']]
    );
    console.log('Inserted Project:', projectResult.rows[0]);

    // Insert a task associated with the project
    const taskResult = await pool.query(
      `INSERT INTO tasks (name, description, project_id, assigned_user_ids)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      ['Task 1', 'A sample task', projectResult.rows[0].id, [1, 2]]
    );
    console.log('Inserted Task:', taskResult.rows[0]);
  } catch (err) {
    console.error('PostgreSQL Test Error:', err);
  } finally {
    pool.end();
  }
};

testPostgres();
