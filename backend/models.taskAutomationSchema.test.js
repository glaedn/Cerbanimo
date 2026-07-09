import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('tasks task automation schema initialization', () => {
  const source = fs.readFileSync(path.resolve('../models/tasks.js'), 'utf8');
  const kamiyaApiSource = fs.readFileSync(path.resolve('../models/kamiya_api.js'), 'utf8');

  it('defines durable classification columns and constraints idempotently', () => {
    for (const column of [
      'automation_classification',
      'automation_confidence',
      'automation_rationale',
      'required_human_inputs',
      'automation_requirements',
      'validation_requirements',
      'automation_policy_findings',
      'classification_source',
      'classification_version',
      'classified_at'
    ]) {
      expect(source).toContain(column);
    }

    expect(source).toContain("ADD COLUMN IF NOT EXISTS automation_classification");
    expect(source).toContain("tasks_automation_classification_check");
    expect(source).toContain("tasks_automation_confidence_check");
    expect(source).toContain("tasks_required_human_inputs_array_check");
    expect(source).toContain("'human_driven', 'assisted_automation', 'fully_automatable'");
    expect(source).toContain("'generated', 'manual', 'legacy_default', 'policy_downgrade', 'review_override'");
  });

  it('defines durable task automation preparations and run links idempotently', () => {
    expect(kamiyaApiSource).toContain('task_automation_preparations');
    expect(kamiyaApiSource).toContain('preparation_id BIGINT');
    expect(kamiyaApiSource).toContain('input_schema_snapshot JSONB');
    expect(kamiyaApiSource).toContain('input_values JSONB');
    expect(kamiyaApiSource).toContain('validation_result JSONB');
    expect(kamiyaApiSource).toContain('capability_snapshot JSONB');
    expect(kamiyaApiSource).toContain('preview_action_id BIGINT');
    expect(kamiyaApiSource).toContain('idx_task_automation_preparations_one_active');
    expect(kamiyaApiSource).toContain("'draft', 'invalid', 'ready', 'previewed', 'consumed', 'cancelled'");
  });

  it('defines runtime finalization tables with every worker-written column', () => {
    expect(kamiyaApiSource).toContain('updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP');
    expect(kamiyaApiSource).toContain('task_id BIGINT REFERENCES tasks(id) ON DELETE SET NULL');
    expect(kamiyaApiSource).toContain('status TEXT NOT NULL DEFAULT');
    expect(kamiyaApiSource).toContain('automation_run_reports_status_check');
    expect(kamiyaApiSource).toContain('submitted_by INTEGER REFERENCES users(id) ON DELETE SET NULL');
    expect(kamiyaApiSource).toContain('report JSONB NOT NULL DEFAULT');
    expect(kamiyaApiSource).toContain('idx_api_action_events_once');
    expect(kamiyaApiSource).toContain('WHERE event_key IS NOT NULL');
    expect(kamiyaApiSource).toContain('event_key TEXT');
  });

  it('defines canonical task evidence and validation tables idempotently', () => {
    for (const table of [
      'task_evidence_blobs',
      'task_evidence_bundles',
      'task_evidence_items',
      'task_validation_results',
      'task_validation_findings',
      'task_validation_reviews'
    ]) {
      expect(kamiyaApiSource).toContain(table);
    }

    expect(kamiyaApiSource).toContain("'human', 'automation', 'mixed'");
    expect(kamiyaApiSource).toContain("'draft'");
    expect(kamiyaApiSource).toContain("'validation_queued'");
    expect(kamiyaApiSource).toContain("'validation_passed'");
    expect(kamiyaApiSource).toContain("'needs_more_evidence'");
    expect(kamiyaApiSource).toContain("'manual_review_required'");
    expect(kamiyaApiSource).toContain("'automation_report'");
    expect(kamiyaApiSource).toContain('sanitizer_version TEXT');
    expect(kamiyaApiSource).toContain('provenance_sha256 TEXT');
    expect(kamiyaApiSource).toContain('combined_sha256 TEXT');
    expect(kamiyaApiSource).toContain('response_status INTEGER');
    expect(kamiyaApiSource).toContain('idx_task_evidence_one_active_draft');
    expect(kamiyaApiSource).toContain('idx_task_validation_results_run');
  });

  it('defines human review rounds, assignments, decisions, events, and acceptance records', () => {
    for (const table of [
      'task_review_rounds',
      'task_review_assignments',
      'task_review_decisions',
      'task_review_events',
      'task_acceptance_records',
      'task_evidence_access_events'
    ]) {
      expect(kamiyaApiSource).toContain(table);
    }

    expect(kamiyaApiSource).toContain("'accepted_pending_settlement'");
    expect(kamiyaApiSource).toContain("'validation_reviewer'");
    expect(kamiyaApiSource).toContain("'peer_reviewer'");
    expect(kamiyaApiSource).toContain("'pm_reviewer'");
    expect(kamiyaApiSource).toContain('idx_task_review_one_active_round');
    expect(kamiyaApiSource).toContain('idx_task_acceptance_one_round');
  });

  it('defines durable Game Master quest, party, invite, and chronicle tables', () => {
    for (const table of [
      'user_narrative_preferences',
      'project_quest_profiles',
      'project_narrative_settings',
      'project_party_settings',
      'project_invites',
      'project_character_callings',
      'project_narrative_events'
    ]) {
      expect(kamiyaApiSource).toContain(table);
    }

    expect(kamiyaApiSource).toContain("'game_master', 'plain'");
    expect(kamiyaApiSource).toContain("'light', 'standard', 'immersive'");
    expect(kamiyaApiSource).toContain("'narrative', 'numeric', 'both'");
    expect(kamiyaApiSource).toContain('token_hash TEXT UNIQUE NOT NULL');
    expect(kamiyaApiSource).toContain('idx_project_quest_profiles_one_active');
    expect(kamiyaApiSource).toContain('idx_project_narrative_events_once');
  });
});
