import pool from '../backend/db.js';
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
      peer_review_deadline TIMESTAMP WITH TIME ZONE,
      pm_approval_deadline TIMESTAMP WITH TIME ZONE,
      task_type VARCHAR(50) DEFAULT 'project_task', -- e.g., project_task, resource_management, community_engagement
      related_resource_id INTEGER REFERENCES resources(id) ON DELETE SET NULL, -- Link to a specific resource if task is resource-related
      related_need_id INTEGER REFERENCES needs(id) ON DELETE SET NULL, -- Link to a specific need if task is need-related
      automation_classification TEXT NOT NULL DEFAULT 'human_driven',
      automation_confidence NUMERIC(4,3),
      automation_rationale TEXT,
      required_human_inputs JSONB NOT NULL DEFAULT '[]'::jsonb,
      automation_requirements JSONB NOT NULL DEFAULT '{}'::jsonb,
      validation_requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
      automation_policy_findings JSONB NOT NULL DEFAULT '[]'::jsonb,
      classification_source TEXT NOT NULL DEFAULT 'legacy_default',
      classification_version TEXT,
      classified_at TIMESTAMP WITH TIME ZONE,
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

  const automationClassificationQuery = `
    ALTER TABLE tasks
      ADD COLUMN IF NOT EXISTS automation_classification TEXT NOT NULL DEFAULT 'human_driven',
      ADD COLUMN IF NOT EXISTS automation_confidence NUMERIC(4,3),
      ADD COLUMN IF NOT EXISTS automation_rationale TEXT,
      ADD COLUMN IF NOT EXISTS required_human_inputs JSONB NOT NULL DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS automation_requirements JSONB NOT NULL DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS validation_requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS automation_policy_findings JSONB NOT NULL DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS classification_source TEXT NOT NULL DEFAULT 'legacy_default',
      ADD COLUMN IF NOT EXISTS classification_version TEXT,
      ADD COLUMN IF NOT EXISTS classified_at TIMESTAMP WITH TIME ZONE;

    UPDATE tasks
    SET automation_classification = 'human_driven'
    WHERE automation_classification IS NULL
       OR automation_classification NOT IN ('human_driven', 'assisted_automation', 'fully_automatable');

    UPDATE tasks
    SET classification_source = 'legacy_default'
    WHERE classification_source IS NULL
       OR classification_source NOT IN ('generated', 'manual', 'legacy_default', 'policy_downgrade', 'review_override');

    UPDATE tasks
    SET automation_confidence = NULL
    WHERE automation_confidence IS NOT NULL
      AND (automation_confidence < 0 OR automation_confidence > 1);

    UPDATE tasks SET required_human_inputs = '[]'::jsonb WHERE jsonb_typeof(required_human_inputs) <> 'array';
    UPDATE tasks SET automation_requirements = '{}'::jsonb WHERE jsonb_typeof(automation_requirements) <> 'object';
    UPDATE tasks SET validation_requirements = '[]'::jsonb WHERE jsonb_typeof(validation_requirements) <> 'array';
    UPDATE tasks SET automation_policy_findings = '[]'::jsonb WHERE jsonb_typeof(automation_policy_findings) <> 'array';

    ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_automation_classification_check;
    ALTER TABLE tasks ADD CONSTRAINT tasks_automation_classification_check
      CHECK (automation_classification IN ('human_driven', 'assisted_automation', 'fully_automatable'));

    ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_automation_confidence_check;
    ALTER TABLE tasks ADD CONSTRAINT tasks_automation_confidence_check
      CHECK (automation_confidence IS NULL OR (automation_confidence >= 0 AND automation_confidence <= 1));

    ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_classification_source_check;
    ALTER TABLE tasks ADD CONSTRAINT tasks_classification_source_check
      CHECK (classification_source IN ('generated', 'manual', 'legacy_default', 'policy_downgrade', 'review_override'));

    ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_required_human_inputs_array_check;
    ALTER TABLE tasks ADD CONSTRAINT tasks_required_human_inputs_array_check
      CHECK (jsonb_typeof(required_human_inputs) = 'array');

    ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_automation_requirements_object_check;
    ALTER TABLE tasks ADD CONSTRAINT tasks_automation_requirements_object_check
      CHECK (jsonb_typeof(automation_requirements) = 'object');

    ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_validation_requirements_array_check;
    ALTER TABLE tasks ADD CONSTRAINT tasks_validation_requirements_array_check
      CHECK (jsonb_typeof(validation_requirements) = 'array');
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

    await pool.query(automationClassificationQuery);
    console.log('PostgreSQL: Task automation classification columns and constraints ensured.');

  } catch (err) {
    console.error('PostgreSQL: Error processing tasks table or related entities:', err);
  }
};

export {
  createTaskTable,
};
