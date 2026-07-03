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
        action_id BIGINT,
        actor_user_id INTEGER,
        source_client TEXT,
        related_project_id INTEGER,
        attempt_count INTEGER NOT NULL DEFAULT 0,
        last_error JSONB,
        claimed_at TIMESTAMP,
        lease_expires_at TIMESTAMP,
        claim_token TEXT,
        next_retry_at TIMESTAMP,
        state JSONB DEFAULT '{}',
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      ALTER TABLE workflow_runs
      ADD COLUMN IF NOT EXISTS action_id BIGINT,
      ADD COLUMN IF NOT EXISTS actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS source_client TEXT,
      ADD COLUMN IF NOT EXISTS related_project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS last_error JSONB,
      ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS lease_expires_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS claim_token TEXT,
      ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS started_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

      ALTER TABLE workflow_runs ALTER COLUMN action_id TYPE BIGINT USING action_id::bigint;

      CREATE INDEX IF NOT EXISTS idx_workflow_runs_action_id ON workflow_runs(action_id);
      CREATE INDEX IF NOT EXISTS idx_workflow_runs_actor_user_id ON workflow_runs(actor_user_id);
      CREATE INDEX IF NOT EXISTS idx_workflow_runs_related_project_id ON workflow_runs(related_project_id);
      CREATE INDEX IF NOT EXISTS idx_workflow_runs_type_status ON workflow_runs(workflow_type, status);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_workflow_runs_one_per_action_type
      ON workflow_runs(action_id, workflow_type)
      WHERE action_id IS NOT NULL;
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

      DELETE FROM workflow_steps a
      USING workflow_steps b
      WHERE a.workflow_run_id = b.workflow_run_id
        AND a.step_name = b.step_name
        AND (
          CASE a.status
            WHEN 'completed' THEN 6 WHEN 'failed' THEN 5 WHEN 'running' THEN 4
            WHEN 'skipped' THEN 3 WHEN 'cancelled' THEN 2 ELSE 1
          END,
          a.created_at,
          a.id::text
        ) < (
          CASE b.status
            WHEN 'completed' THEN 6 WHEN 'failed' THEN 5 WHEN 'running' THEN 4
            WHEN 'skipped' THEN 3 WHEN 'cancelled' THEN 2 ELSE 1
          END,
          b.created_at,
          b.id::text
        );

      CREATE INDEX IF NOT EXISTS idx_workflow_steps_run_name ON workflow_steps(workflow_run_id, step_name);
      CREATE INDEX IF NOT EXISTS idx_workflow_steps_run_status ON workflow_steps(workflow_run_id, status);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_workflow_steps_unique_run_step
      ON workflow_steps(workflow_run_id, step_name);
    `);

    await client.query(`
      DO $$
      BEGIN
        IF to_regclass('public.api_actions') IS NOT NULL
           AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'workflow_runs_action_id_fkey') THEN
          ALTER TABLE workflow_runs
          ADD CONSTRAINT workflow_runs_action_id_fkey
          FOREIGN KEY (action_id) REFERENCES api_actions(id) ON DELETE SET NULL;
        END IF;
      END $$;
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
