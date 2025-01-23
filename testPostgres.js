require('dotenv').config();
const { Pool } = require('pg');
const { createUserTable } = require('./models/user')
const { createProjectTable } = require('./models/project');
const { createTaskTable } = require('./models/task');
console.log('Postgres URL:', process.env.POSTGRES_URL);
console.log('createUserTable:', typeof createUserTable);
console.log('createProjectTable:', typeof createProjectTable);
console.log('createTaskTable:', typeof createTaskTable);
console.log('Project Model:', typeof Project);

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
    (async () => {
        await createUserTable();
        await createProjectTable();
        await createTaskTable();
      })();
    const userResult = await pool.query(
      `INSERT INTO users (username, email, password_hash)
      VALUES ($1, $2, $3) RETURNING *`,
      ['testuser', 'testuser@example.com', 'hashed_password']
    );
    console.log('Inserted User:', userResult.rows[0]);
      
    // Insert a project
    const projectResult = await pool.query(
      `INSERT INTO projects (name, description, user_ids, creator_id, tags)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      ['Project A', 'A sample project', [userResult.rows[0].id], userResult.rows[0].id, ['#tech', '#collaboration']]
    );
    console.log('Inserted Project:', projectResult.rows[0]);

    // Insert a task associated with the project
    const taskResult = await pool.query(
      `INSERT INTO tasks (name, description, project_id, assigned_user_ids)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      ['Task 1', 'A sample task', projectResult.rows[0].id, [userResult.rows[0].id]]
    );
    console.log('Inserted Task:', taskResult.rows[0]);
  } catch (err) {
    console.error('PostgreSQL Test Error:', err);
  } finally {
    pool.end();
  }
};

testPostgres();
