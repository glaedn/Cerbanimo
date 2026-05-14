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
        state JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
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
