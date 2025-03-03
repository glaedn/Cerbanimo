const { Pool } = require('pg');

// PostgreSQL connection
const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

// User schema with tasks relationship
const createUserTable = async () => {
  const userTableQuery = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const tasksTableQuery = `
    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const userTasksTableQuery = `
    CREATE TABLE IF NOT EXISTS user_tasks (
      user_id INT REFERENCES users(id) ON DELETE CASCADE,
      task_id INT REFERENCES tasks(id) ON DELETE CASCADE,
      PRIMARY KEY (user_id, task_id)
    );
  `;

  try {
    await pool.query(userTableQuery);
    await pool.query(tasksTableQuery);
    await pool.query(userTasksTableQuery);
    console.log('PostgreSQL: Users, Tasks, and User_Tasks tables created or already exist');
  } catch (err) {
    console.error('PostgreSQL: Error creating tables:', err);
  }
};

const mongoose = require('mongoose');

// MongoDB user schema with tasks relationship
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  tasks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }], // Reference to Task schema
  createdAt: { type: Date, default: Date.now },
});

// Export the model
const User = mongoose.model('User', userSchema);
module.exports = User;
module.exports = {
    createUserTable, // PostgreSQL
    User, // MongoDB
  };
