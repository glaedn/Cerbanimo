import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd(), '..');

describe('workflow schema hardening', () => {
  const workflowSql = fs.readFileSync(path.join(root, 'models', 'workflows.js'), 'utf8');
  const alterSql = fs.readFileSync(path.join(root, 'models', 'alter_tables_v2.js'), 'utf8');

  it('uses BIGINT action references and creates the action foreign key idempotently', () => {
    expect(workflowSql).toContain('action_id BIGINT');
    expect(workflowSql).toContain('workflow_runs_action_id_fkey');
    expect(workflowSql).toContain('REFERENCES api_actions(id) ON DELETE SET NULL');
    expect(alterSql).toContain('ALTER COLUMN action_id TYPE BIGINT');
  });

  it('enforces one bootstrap workflow per action and one row per workflow step', () => {
    expect(workflowSql).toContain('idx_workflow_runs_one_per_action_type');
    expect(workflowSql).toContain('idx_workflow_steps_unique_run_step');
    expect(alterSql).toContain('idx_workflow_runs_one_per_action_type');
    expect(alterSql).toContain('idx_workflow_steps_unique_run_step');
  });

  it('deduplicates existing workflow steps before adding the unique index', () => {
    expect(workflowSql).toContain('DELETE FROM workflow_steps a');
    expect(alterSql).toContain('DELETE FROM workflow_steps a');
  });
});
