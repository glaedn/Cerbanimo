const { Pool } = require('pg');

// PostgreSQL connection
const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

// Task schema creation
const createTaskTable = async () => {
  const query = `
    CREATE TYPE IF NOT EXISTS task_status AS ENUM (
      'inactive-unassigned',
      'inactive-assigned',
      'active-unassigned',
      'active-assigned',
      'urgent-unassigned',
      'urgent-assigned',
      'completed'
    );

    CREATE TABLE IF NOT EXISTS public.tasks (
      id integer NOT NULL GENERATED ALWAYS AS IDENTITY,
      name character varying(100) NOT NULL,
      description text,
      created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
      project_id integer,
      assigned_user_ids integer[] DEFAULT '{}',
      creator_id integer,
      skill_id integer,
      active_ind boolean,
      reward_tokens integer DEFAULT 10,
      submitted boolean DEFAULT false,
      submitted_at timestamp without time zone,
      spent_points integer[],
      proof_of_work_links TEXT[] DEFAULT '{}',
      
      -- New columns
      status task_status NOT NULL DEFAULT 'inactive-unassigned',   -- Add status column
      dependencies INTEGER[] DEFAULT '{}',  -- Add dependencies column
      -- New fields for task type and resource/need linkage
      task_type VARCHAR(50) DEFAULT 'project_task', -- e.g., project_task, resource_pickup, resource_delivery, etc.
      related_resource_id INTEGER REFERENCES resources(id) ON DELETE SET NULL,
      related_need_id INTEGER REFERENCES needs(id) ON DELETE SET NULL,
      
      -- Standard timestamp fields
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

      CONSTRAINT fk_dependencies FOREIGN KEY (id) REFERENCES tasks(id) ON DELETE CASCADE -- Optional, can be enforced by trigger
    );
  `;
  
  try {
    await pool.query(query);
    console.log('PostgreSQL: Tasks table created or already exists');
  } catch (err) {
    console.error('PostgreSQL: Error creating tasks table:', err);
  }
};

module.exports = {
  createTaskTable // PostgreSQL
};
