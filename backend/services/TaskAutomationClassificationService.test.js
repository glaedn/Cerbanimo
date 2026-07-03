import { describe, expect, it } from 'vitest';
import { normalizeTaskAutomationClassification } from './TaskAutomationClassificationService.js';

describe('TaskAutomationClassificationService', () => {
  const cases = [
    {
      name: 'physical mutual-aid delivery',
      task: { name: 'Deliver mutual-aid supplies', description: 'Pick up and deliver food locally.', automation_classification: 'fully_automatable', is_local: true },
      expected: 'human_driven'
    },
    {
      name: 'repository feature with missing repo details',
      task: {
        name: 'Implement voting widget',
        description: 'Build a feature after the repository is selected.',
        automation_classification: 'assisted_automation',
        required_human_inputs: [{ key: 'repository', label: 'Repository', inputType: 'repository', required: true }]
      },
      expected: 'assisted_automation'
    },
    {
      name: 'known quality checks',
      task: {
        name: 'Run known quality checks',
        description: 'Run npm test and return a report.',
        automation_classification: 'fully_automatable',
        required_human_inputs: [],
        automation_requirements: {
          capabilities: ['github.run_quality_checks'],
          expectedArtifacts: ['quality-check-report'],
          networkAccess: 'restricted'
        }
      },
      expected: 'fully_automatable'
    },
    {
      name: 'community constitutional vote',
      task: { name: 'Hold community constitutional vote', description: 'Facilitate a binding governance vote.', automation_classification: 'fully_automatable' },
      expected: 'human_driven'
    },
    {
      name: 'draft outreach requiring approval',
      task: {
        name: 'Draft outreach',
        description: 'Draft public outreach after approval.',
        automation_classification: 'assisted_automation',
        required_human_inputs: [{ key: 'approval', label: 'Approval', inputType: 'approval', required: true }]
      },
      expected: 'assisted_automation'
    },
    {
      name: 'json schema validation',
      task: {
        name: 'Validate JSON file against schema',
        description: 'Validate provided JSON using a known schema.',
        automation_classification: 'fully_automatable',
        automation_requirements: {
          capabilities: ['data.validate_json_schema'],
          expectedArtifacts: ['schema-validation-report'],
          networkAccess: 'none'
        },
        validation_requirements: [{ requirementId: 'schema-valid', description: 'Schema validation result exists.', proofTypes: ['command_result'], checks: ['exit_code_recorded'] }]
      },
      expected: 'fully_automatable'
    },
    {
      name: 'vague task fails closed',
      task: { name: 'Make the project better', description: 'Improve things.', automation_classification: 'fully_automatable' },
      expected: 'human_driven'
    }
  ];

  it.each(cases)('classifies $name as $expected', ({ task, expected }) => {
    expect(normalizeTaskAutomationClassification(task, { source: 'generated' }).classification).toBe(expected);
  });

  it('downgrades contradictory fully automatable metadata with required inputs', () => {
    const result = normalizeTaskAutomationClassification({
      name: 'Run report after source is selected',
      automation_classification: 'fully_automatable',
      required_human_inputs: [{ key: 'source', label: 'Source', inputType: 'file', required: true }],
      automation_requirements: { capabilities: ['reports.generate'], expectedArtifacts: ['report'] }
    }, { source: 'generated' });

    expect(result.classification).toBe('assisted_automation');
    expect(result.source).toBe('policy_downgrade');
    expect(result.findings.some((finding) => finding.code === 'FULLY_AUTOMATABLE_WITH_INPUTS_DOWNGRADED')).toBe(true);
  });

  it('does not persist chain-of-thought sized rationales', () => {
    const result = normalizeTaskAutomationClassification({
      automation_classification: 'human_driven',
      automation_rationale: 'x'.repeat(600)
    });

    expect(result.rationale.length).toBeLessThanOrEqual(240);
  });
});
