// Load environment variables
require('dotenv').config();

// PostgreSQL
const { Pool } = require('pg');
const { createUserTable } = require('./models/user');
const { createProjectTable } = require('./models/project');
const { createTaskTable } = require('./models/task');

// MongoDB
const mongoose = require('mongoose');
const User = require('./models/user');
const Project = require('./models/project');
const Task = require('./models/task');

// PostgreSQL Connection
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Postgres Connection Error:', err);
  } else {
    console.log('Postgres Connected:', res.rows[0]);
  }
  pool.end(); // Close the connection after testing
});

// MongoDB Connection
mongoose
  .connect(process.env.MONGODB_URL, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB Connected'))
  .catch((err) => console.error('MongoDB Connection Error:', err));
