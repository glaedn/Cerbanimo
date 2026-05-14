import pool from '../../db.js';

export async function createWorkflowRun(workflowType, state = {}) {
  const query = `
    INSERT INTO workflow_runs (workflow_type, status, state)
    VALUES ($1, 'running', $2)
    RETURNING id
  `;
  const res = await pool.query(query, [workflowType, state]);
  return res.rows[0].id;
}

export async function updateWorkflowRun(runId, status, state = null) {
  let query = 'UPDATE workflow_runs SET status = $1, updated_at = NOW()';
  const params = [status];

  if (state) {
    query += ', state = state || $2';
    params.push(state);
    query += ' WHERE id = $3';
  } else {
    query += ' WHERE id = $2';
  }

  await pool.query(query, params);
}

export async function createWorkflowStep(runId, stepName, payload = {}) {
  const query = `
    INSERT INTO workflow_steps (workflow_run_id, step_name, status, payload, started_at)
    VALUES ($1, $2, 'running', $3, NOW())
    RETURNING id
  `;
  const res = await pool.query(query, [runId, stepName, payload]);
  return res.rows[0].id;
}

export async function completeWorkflowStep(stepId, result = {}) {
  const query = `
    UPDATE workflow_steps
    SET status = 'completed', result = $1, completed_at = NOW()
    WHERE id = $2
  `;
  await pool.query(query, [result, stepId]);
}

export async function failWorkflowStep(stepId, error) {
  const query = `
    UPDATE workflow_steps
    SET status = 'failed', result = $1, completed_at = NOW()
    WHERE id = $2
  `;
  await pool.query(query, [{ error: error.message || error }, stepId]);
}
