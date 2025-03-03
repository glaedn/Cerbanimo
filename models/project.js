const { Pool } = require('pg');
const mongoose = require('mongoose');

// PostgreSQL connection
const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

// PostgreSQL Project Table Schema
const createProjectTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS projects (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      task_group_ids INT[] DEFAULT '{}',
      user_ids INT[] DEFAULT '{}',
      creator_id INT REFERENCES users(id) ON DELETE CASCADE,
      tags TEXT[] DEFAULT '{}',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await pool.query(query);
    console.log('PostgreSQL: Projects table created or already exists');
  } catch (err) {
    console.error('PostgreSQL: Error creating projects table:', err);
  }
};

// MongoDB Project Schema
const projectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  taskGroups: [{ type: mongoose.Schema.Types.ObjectId, ref: 'TaskGroup' }], // Reference to Task Groups
  users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Reference to Users
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Reference to Creator
  tags: [{ type: String }], // Array of tags
  createdAt: { type: Date, default: Date.now },
});

// MongoDB Project Model
const Project = mongoose.model('Project', projectSchema);

// Consolidated Exports
module.exports = {
  createProjectTable, // PostgreSQL
  Project, // MongoDB
};
