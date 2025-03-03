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
      console.log('Initializing PostgreSQL test...');
  
      // Initialize schema
      await createUserTable();
      await createProjectTable();
      await createTaskTable();
  
      // Insert a user
      const userResult = await pool.query(
        `INSERT INTO users (username, email, skills, interests, experience)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          'testuser2',
          'testuser2@example.com',
          ['React', 'Node.js'], // Skills
          ['Web Development', 'Open Source'], // Interests
          ['https://tasks.cerbanimo.com/task/1', 'https://tasks.cerbanimo.com/task/2'], // Experience links
        ]
      );
      console.log('Inserted User:', userResult.rows[0]);
  
      // Fetch the user
      const fetchedUser = await pool.query('SELECT * FROM users WHERE username = $1', ['testuser']);
      console.log('Fetched User:', fetchedUser.rows[0]);
  
      // Update the user's profile
      const updatedUser = await pool.query(
        `UPDATE users
         SET skills = $1, interests = $2, experience = $3
         WHERE username = $4
         RETURNING *`,
        [
          ['React', 'TypeScript', 'GraphQL'], // Updated skills
          ['Open Source', 'UI/UX Design'], // Updated interests
          ['https://tasks.cerbanimo.com/task/3'], // Updated experience links
          'testuser2',
        ]
      );
      console.log('Updated User:', updatedUser.rows[2]);
    } catch (err) {
      console.error('PostgreSQL Test Error:', err);
    } finally {
      pool.end();
    }
  };
  
  testPostgres();
