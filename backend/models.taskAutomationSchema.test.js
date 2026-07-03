import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('tasks task automation schema initialization', () => {
  const source = fs.readFileSync(path.resolve('../models/tasks.js'), 'utf8');

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
});
