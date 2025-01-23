const { Pool } = require('pg');

// PostgreSQL connection
const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

// Task schema creation
const createTaskTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      project_id INT REFERENCES projects(id) ON DELETE CASCADE,
      assigned_user_ids INT[] DEFAULT '{}',
      creator_id INT[] DEFAULT '{}',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await pool.query(query);
    console.log('PostgreSQL: Tasks table created or already exists');
  } catch (err) {
    console.error('PostgreSQL: Error creating tasks table:', err);
  }
};

const mongoose = require('mongoose');

// MongoDB task schema
const taskSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    assignedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Reference to Users
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true }, // Reference to Project
    createdAt: { type: Date, default: Date.now },
  });

// Export the model
const Task = mongoose.model('Task', taskSchema);
module.exports = {
    createTaskTable, // PostgreSQL
    Task, // MongoDB
  };