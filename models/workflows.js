import pool from '../backend/db.js';

export async function createWorkflowTables() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Workflow Runs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS workflow_runs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workflow_type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        action_id INTEGER,
        actor_user_id INTEGER,
        source_client TEXT,
        related_project_id INTEGER,
        attempt_count INTEGER NOT NULL DEFAULT 0,
        last_error JSONB,
        state JSONB DEFAULT '{}',
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      ALTER TABLE workflow_runs
      ADD COLUMN IF NOT EXISTS action_id INTEGER REFERENCES api_actions(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS source_client TEXT,
      ADD COLUMN IF NOT EXISTS related_project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS last_error JSONB,
      ADD COLUMN IF NOT EXISTS started_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

      CREATE INDEX IF NOT EXISTS idx_workflow_runs_action_id ON workflow_runs(action_id);
      CREATE INDEX IF NOT EXISTS idx_workflow_runs_actor_user_id ON workflow_runs(actor_user_id);
      CREATE INDEX IF NOT EXISTS idx_workflow_runs_related_project_id ON workflow_runs(related_project_id);
      CREATE INDEX IF NOT EXISTS idx_workflow_runs_type_status ON workflow_runs(workflow_type, status);
    `);

    // Workflow Steps table
    await client.query(`
      CREATE TABLE IF NOT EXISTS workflow_steps (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workflow_run_id UUID REFERENCES workflow_runs(id) ON DELETE CASCADE,
        step_name TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        payload JSONB DEFAULT '{}',
        result JSONB,
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      ALTER TABLE workflow_steps
      ADD COLUMN IF NOT EXISTS payload JSONB DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS result JSONB,
      ADD COLUMN IF NOT EXISTS started_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

      CREATE INDEX IF NOT EXISTS idx_workflow_steps_run_name ON workflow_steps(workflow_run_id, step_name);
      CREATE INDEX IF NOT EXISTS idx_workflow_steps_run_status ON workflow_steps(workflow_run_id, status);
    `);

    await client.query('COMMIT');
    console.log('Workflow tables created successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating workflow tables:', err);
    throw err;
  } finally {
    client.release();
  }
}
