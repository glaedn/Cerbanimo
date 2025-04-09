const { Pool } = require('pg');
const mongoose = require('mongoose');

// PostgreSQL connection
const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

// PostgreSQL Project Table Schema
const createProjectTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS public.projects (
      id integer NOT NULL GENERATED ALWAYS AS IDENTITY,
      name character varying(100) NOT NULL,
      description text,
      task_group_ids integer[] DEFAULT '{}',
      user_ids integer[] DEFAULT '{}',
      creator_id integer,
      tags text[] DEFAULT '{}',
      created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
      token_pool integer DEFAULT 250,
      used_tokens integer DEFAULT 0,
      reserved_tokens integer DEFAULT 0
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
