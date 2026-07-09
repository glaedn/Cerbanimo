import { afterEach, describe, expect, it, vi } from 'vitest';
import TaskEvidenceService from './TaskEvidenceService.js';
import EvidenceValidationProvider from './EvidenceValidationProvider.js';

describe('TaskEvidenceService deterministic validation', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not invoke semantic provider when semanticReview is never', async () => {
    const spy = vi.spyOn(EvidenceValidationProvider, 'semanticReview');
    const result = await TaskEvidenceService.evaluateRequirement({
      requirement: {
        requirementId: 'proof',
        description: 'Specific proof',
        acceptedEvidenceTypes: ['text'],
        checks: ['reflection_present'],
        minimumEvidenceItems: 1,
        semanticReview: 'never'
      },
      task: { id: 1 },
      bundle: { id: 2, reflection: 'I completed the required proof.' },
      items: [{ id: 3, evidence_type: 'text', requirement_ids: ['proof'], content_sha256: 'abc', text_content: 'done' }],
      requirementCount: 1
    });

    expect(spy).not.toHaveBeenCalled();
    expect(result.requirementResult.verdict).toBe('satisfied');
  });

  it('routes unsupported checks to manual review instead of passing', async () => {
    const result = await TaskEvidenceService.evaluateRequirement({
      requirement: {
        requirementId: 'unknown',
        description: 'Unsupported proof',
        acceptedEvidenceTypes: ['text'],
        checks: ['made_up_check'],
        minimumEvidenceItems: 1,
        semanticReview: 'never'
      },
      task: { id: 1 },
      bundle: { id: 2, reflection: 'done' },
      items: [{ id: 3, evidence_type: 'text', requirement_ids: ['unknown'], content_sha256: 'abc' }],
      requirementCount: 1
    });

    expect(result.requirementResult.verdict).toBe('manual_review_required');
    expect(result.findings.map(finding => finding.code)).toContain('VALIDATION_CHECK_UNSUPPORTED');
  });

  it('does not let one unmapped item satisfy multiple requirements', async () => {
    const result = await TaskEvidenceService.evaluateRequirement({
      requirement: {
        requirementId: 'second',
        description: 'Second specific proof',
        acceptedEvidenceTypes: ['text'],
        checks: ['reflection_present'],
        minimumEvidenceItems: 1,
        semanticReview: 'never'
      },
      task: { id: 1 },
      bundle: { id: 2, reflection: 'done' },
      items: [{ id: 3, evidence_type: 'text', requirement_ids: [], content_sha256: 'abc' }],
      requirementCount: 2
    });

    expect(result.requirementResult.verdict).toBe('insufficient_evidence');
  });
});
