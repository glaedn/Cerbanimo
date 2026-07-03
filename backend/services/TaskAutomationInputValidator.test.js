import { describe, expect, it } from 'vitest';
import { qualityCheckInputSchema, validatePreparationInputs } from './TaskAutomationInputValidator.js';

describe('TaskAutomationInputValidator', () => {
  it('accepts sanitized quality-check inputs with explicit approval', () => {
    const result = validatePreparationInputs(qualityCheckInputSchema(), {
      repository: 'glaedn/Kamiya',
      ref: 'main',
      checkProfile: 'node_standard',
      approval: true
    }, { actorUserId: 42 });

    expect(result.valid).toBe(true);
    expect(result.sanitizedValues.repository).toBe('glaedn/Kamiya');
    expect(result.sanitizedValues.approval).toMatchObject({ approved: true, actorUserId: 42 });
  });

  it('rejects raw sensitive values and requires secret references instead', () => {
    const result = validatePreparationInputs([
      { key: 'api_token', label: 'API token', inputType: 'text', required: true, sensitive: true }
    ], {
      api_token: 'real-token-value'
    });

    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe('RAW_SENSITIVE_VALUE_REJECTED');
  });

  it('ignores unknown inputs instead of persisting stray user data', () => {
    const result = validatePreparationInputs([
      { key: 'repository', label: 'Repository', inputType: 'repository', required: true }
    ], {
      repository: 'glaedn/Kamiya',
      extra_notes: 'do not persist me'
    });

    expect(result.valid).toBe(true);
    expect(result.sanitizedValues.extra_notes).toBeUndefined();
    expect(result.findings[0].code).toBe('UNKNOWN_INPUT_IGNORED');
  });
});
