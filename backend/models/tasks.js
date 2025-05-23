const pool = require('../db'); // Assuming db.js contains the PostgreSQL pool configuration

const createTaskTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE, -- Assuming a projects table exists
      creator_id INTEGER REFERENCES users(id) ON DELETE SET NULL,   -- Assuming a users table exists
      assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL, -- Simplified to single user assignment for now
      status VARCHAR(50) DEFAULT 'open', -- e.g., open, in_progress, pending_review, completed, archived
      due_date TIMESTAMP,
      
      -- New fields for task type and resource/need linkage
      task_type VARCHAR(50) DEFAULT 'project_task', -- e.g., project_task, resource_pickup, resource_delivery, etc.
      related_resource_id INTEGER REFERENCES resources(id) ON DELETE SET NULL,
      related_need_id INTEGER REFERENCES needs(id) ON DELETE SET NULL,
      
      -- Standard timestamp fields
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

      -- Other plausible fields based on prompt's summary (can be expanded later)
      reward_tokens INTEGER DEFAULT 0,
      priority VARCHAR(50) DEFAULT 'medium' -- e.g., low, medium, high
      // For fields like 'dependencies' (e.g. task A must be done before task B), 
      // a separate junction table (e.g., task_dependencies) would be more appropriate for many-to-many relationships.
      // 'skill_id' could reference a 'skills' table if specific skills are required.
      // 'proof_of_work_links' could be TEXT[] if multiple links are allowed.
    );
  `;
  try {
    await pool.query(query);
    console.log('Tasks table created successfully (or already exists).');
  } catch (err) {
    console.error('Error creating tasks table:', err);
    throw err;
  }
};

const createTaskUpdatedAtTrigger = async () => {
  // Re-using the generic trigger function name, assuming it's defined once per database or schema.
  // If it might conflict or needs to be schema-specific, it could be named uniquely.
  const triggerFunctionQuery = `
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `;

  const triggerQuery = `
    DROP TRIGGER IF EXISTS tasks_updated_at_trigger ON tasks; -- Drop existing trigger if any
    CREATE TRIGGER tasks_updated_at_trigger
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  `;
  try {
    await pool.query(triggerFunctionQuery); // Ensure function is created/updated
    await pool.query(triggerQuery); // Create the trigger on the tasks table
    console.log('Tasks updated_at trigger created successfully.');
  } catch (err) {
    console.error('Error creating tasks updated_at trigger:', err);
    // Not throwing err here as table creation might be more critical,
    // but logging it is important. Or, decide if this is a fatal error.
  }
};

module.exports = {
  createTaskTable,
  createTaskUpdatedAtTrigger,
};
