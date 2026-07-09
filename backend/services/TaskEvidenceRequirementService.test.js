import { describe, expect, it } from 'vitest';
import TaskEvidenceRequirementService from './TaskEvidenceRequirementService.js';

describe('TaskEvidenceRequirementService', () => {
  it('normalizes legacy proofTypes into accepted evidence types', () => {
    const requirements = TaskEvidenceRequirementService.normalizeForTask({
      validation_requirements: [{
        requirementId: 'proof',
        description: 'Show the thing worked',
        proofTypes: ['url_snapshot', 'image'],
        checks: ['evidence_present']
      }]
    });

    expect(requirements[0].requirementId).toBe('proof');
    expect(requirements[0].acceptedEvidenceTypes).toEqual(['url_snapshot', 'image']);
    expect(requirements[0].checks).toEqual(['evidence_present']);
  });

  it('generates a default requirement when a task has no validation metadata', () => {
    const requirements = TaskEvidenceRequirementService.normalizeForTask({});

    expect(requirements).toHaveLength(1);
    expect(requirements[0].requirementId).toBe('general-proof');
    expect(requirements[0].checks).toContain('reflection_present');
  });

  it('rejects duplicate requirement ids', () => {
    expect(() => TaskEvidenceRequirementService.normalizeForTask({
      validation_requirements: [{ requirementId: 'same' }, { requirementId: 'same' }]
    })).toThrow(/Duplicate validation requirement id/);
  });
});
