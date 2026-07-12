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

  it('repairs older project tables with visibility for task access policy queries', () => {
    expect(alterSql).toContain("ADD COLUMN IF NOT EXISTS visibility VARCHAR(50) DEFAULT 'public'");
  });

  it('repairs older user tables with auth bypass account columns', () => {
    expect(alterSql).toContain('ADD COLUMN IF NOT EXISTS skills JSONB');
    expect(alterSql).toContain('ADD COLUMN IF NOT EXISTS interests JSONB');
    expect(alterSql).toContain('ALTER COLUMN skills DROP DEFAULT');
    expect(alterSql).toContain('ALTER COLUMN skills TYPE JSONB');
    expect(alterSql).toContain('ALTER COLUMN interests DROP DEFAULT');
    expect(alterSql).toContain('ALTER COLUMN interests TYPE JSONB');
    expect(alterSql).toContain('ADD COLUMN IF NOT EXISTS roles TEXT[]');
    expect(alterSql).toContain('ADD COLUMN IF NOT EXISTS alpha BOOLEAN DEFAULT FALSE');
    expect(alterSql).toContain('ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP');
  });
});
