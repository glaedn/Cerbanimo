import { afterEach, describe, expect, it } from 'vitest';
import { resolveTaskAutomationCapability } from './TaskAutomationCapabilityResolver.js';

const originalEnv = { ...process.env };

describe('TaskAutomationCapabilityResolver', () => {
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('reports production sandbox gating when no executor is configured', () => {
    delete process.env.CERBANIMO_QUALITY_CHECK_EXECUTOR;
    const capability = resolveTaskAutomationCapability({
      task: qualityCheckTask(),
      preparation: { capability_name: 'github.run_quality_checks' },
      scopes: ['automation:write'],
      validationResult: { valid: true }
    });

    expect(capability.executionAvailable).toBe(false);
    expect(capability.reasons).toContain('PRODUCTION_SANDBOX_REQUIRED');
  });

  it('enables deterministic quality checks only in guarded E2E mode', () => {
    process.env.NODE_ENV = 'test';
    process.env.CERBANIMO_E2E_MODE = 'true';
    process.env.POSTGRES_URL = 'postgres://postgres@127.0.0.1:5432/cerbanimo_e2e_quality';
    process.env.CERBANIMO_QUALITY_CHECK_EXECUTOR = 'deterministic';

    const capability = resolveTaskAutomationCapability({
      task: qualityCheckTask(),
      preparation: { capability_name: 'github.run_quality_checks' },
      scopes: ['automation:write'],
      validationResult: { valid: true }
    });

    expect(capability.executionAvailable).toBe(true);
    expect(capability.availableCapabilities).toContain('github.run_quality_checks');
  });

  it('separates registered capability from actor authorization', () => {
    process.env.NODE_ENV = 'test';
    process.env.CERBANIMO_E2E_MODE = 'true';
    process.env.POSTGRES_URL = 'postgres://postgres@127.0.0.1:5432/cerbanimo_e2e_quality';
    process.env.CERBANIMO_QUALITY_CHECK_EXECUTOR = 'deterministic';

    const capability = resolveTaskAutomationCapability({
      task: qualityCheckTask(),
      preparation: { capability_name: 'github.run_quality_checks' },
      scopes: ['automation:read'],
      validationResult: { valid: true }
    });

    expect(capability.executionAvailable).toBe(false);
    expect(capability.reasons).toContain('ACTOR_SCOPE_MISSING');
  });
});

function qualityCheckTask() {
  return {
    automation: {
      classification: 'fully_automatable',
      requirements: { capabilities: ['github.run_quality_checks'] }
    }
  };
}
