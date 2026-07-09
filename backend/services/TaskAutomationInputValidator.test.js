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
    expect(result.sanitizedValues.approval.effectHash).toMatch(/^[a-f0-9]{64}$/);
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

  it('rejects truthy strings for boolean fields', () => {
    const result = validatePreparationInputs([
      { key: 'enabled', label: 'Enabled', inputType: 'boolean', required: true }
    ], {
      enabled: 'true'
    });

    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe('TYPE_BOOLEAN_STRICT');
  });

  it('marks an approval stale when protected inputs change', () => {
    const first = validatePreparationInputs(qualityCheckInputSchema(), {
      repository: 'glaedn/Kamiya',
      ref: 'main',
      checkProfile: 'node_standard',
      approval: true
    }, { actorUserId: 42 });

    const second = validatePreparationInputs(qualityCheckInputSchema(), {
      ...first.sanitizedValues,
      ref: 'release',
      approval: first.sanitizedValues.approval
    }, { actorUserId: 42 });

    expect(second.valid).toBe(false);
    expect(second.errors.find(error => error.code === 'APPROVAL_STALE')).toBeTruthy();
  });

  it('rejects secret and file references until registries are wired', () => {
    const secret = validatePreparationInputs([
      { key: 'api_token', label: 'API token', inputType: 'secret_reference', required: true }
    ], {
      api_token: 'secret:token'
    });
    const file = validatePreparationInputs([
      { key: 'artifact', label: 'Artifact', inputType: 'file', required: true }
    ], {
      artifact: 'cerbanimo-file://artifact'
    });

    expect(secret.valid).toBe(false);
    expect(secret.errors[0].code).toBe('SECRET_REFERENCE_UNSUPPORTED');
    expect(file.valid).toBe(false);
    expect(file.errors[0].code).toBe('FILE_REFERENCE_UNSUPPORTED');
  });
});
