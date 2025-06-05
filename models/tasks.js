const pool = require('../backend/db.js');

const createTaskTable = async () => {
  const taskTableQuery = `
    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      creator_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      skill_id INTEGER REFERENCES skills(id) ON DELETE SET NULL,
      skill_level INTEGER DEFAULT 0,
      status VARCHAR(50) NOT NULL DEFAULT 'inactive-unassigned',
      assigned_user_ids INTEGER[] DEFAULT '{}',
      reward_tokens INTEGER DEFAULT 10,
      dependencies INTEGER[] DEFAULT '{}', -- Stores IDs of tasks that must be completed before this one
      submitted BOOLEAN DEFAULT FALSE,
      submitted_at TIMESTAMP WITH TIME ZONE,
      submitted_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      proof_of_work_links TEXT[] DEFAULT '{}',
      reflection TEXT, -- User's reflection upon completing the task
      reviewer_ids INTEGER[] DEFAULT '{}', -- IDs of users assigned to review the task
      approvals INTEGER[] DEFAULT '{}', -- IDs of users who approved the task completion
      rejections INTEGER[] DEFAULT '{}', -- IDs of users who rejected the task completion
      task_type VARCHAR(50) DEFAULT 'project_task', -- e.g., project_task, resource_management, community_engagement
      related_resource_id INTEGER REFERENCES resources(id) ON DELETE SET NULL, -- Link to a specific resource if task is resource-related
      related_need_id INTEGER REFERENCES needs(id) ON DELETE SET NULL, -- Link to a specific need if task is need-related
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const triggerQuery = `
    CREATE OR REPLACE FUNCTION trigger_set_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER set_task_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();
  `;

  const indexesQuery = `
    CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_creator_id ON tasks(creator_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_skill_id ON tasks(skill_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_assigned_user_ids ON tasks USING GIN(assigned_user_ids);
    CREATE INDEX IF NOT EXISTS idx_tasks_dependencies ON tasks USING GIN(dependencies);
    CREATE INDEX IF NOT EXISTS idx_tasks_task_type ON tasks(task_type);
  `;

  try {
    await pool.query(taskTableQuery);
    console.log('PostgreSQL: Tasks table created or already exists.');

    // Attempt to create trigger function and trigger
    // Wrap in a try-catch for the trigger part to handle cases where the function might already exist
    try {
        await pool.query(triggerQuery);
        console.log('PostgreSQL: Trigger set_task_updated_at created for tasks table.');
    } catch (triggerErr) {
        if (triggerErr.code === '42723' && triggerErr.message.includes('trigger_set_timestamp')) { // function already exists
            console.log('PostgreSQL: Trigger function trigger_set_timestamp already exists, attempting to create trigger only.');
            const createTriggerOnlyQuery = `
              CREATE TRIGGER set_task_updated_at
              BEFORE UPDATE ON tasks
              FOR EACH ROW
              EXECUTE FUNCTION trigger_set_timestamp();
            `;
            // Check if trigger already exists before attempting to create it
            const checkTriggerExistsQuery = `
              SELECT 1 FROM pg_trigger WHERE tgname = 'set_task_updated_at' AND tgrelid = 'tasks'::regclass;
            `;
            const triggerExistsResult = await pool.query(checkTriggerExistsQuery);
            if (triggerExistsResult.rowCount === 0) {
              await pool.query(createTriggerOnlyQuery);
              console.log('PostgreSQL: Trigger set_task_updated_at created for tasks table (function previously existed).');
            } else {
              console.log('PostgreSQL: Trigger set_task_updated_at already exists for tasks table.');
            }
        } else if (triggerErr.code === '42710' && triggerErr.message.includes('trigger "set_task_updated_at" for relation "tasks" already exists')) {
             console.log('PostgreSQL: Trigger set_task_updated_at already exists for tasks table.');
        } else {
            // Re-throw other trigger errors
            throw triggerErr;
        }
    }

    await pool.query(indexesQuery);
    console.log('PostgreSQL: Indexes on tasks table created or ensured.');

  } catch (err) {
    console.error('PostgreSQL: Error processing tasks table or related entities:', err);
  }
};

module.exports = {
  createTaskTable,
};
