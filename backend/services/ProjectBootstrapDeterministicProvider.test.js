import { afterEach, describe, expect, it, vi } from 'vitest';

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  vi.resetModules();
});

describe('ProjectBootstrap deterministic provider guard', () => {
  it('refuses outside test e2e mode', async () => {
    process.env.NODE_ENV = 'development';
    process.env.CERBANIMO_E2E_MODE = 'false';
    process.env.POSTGRES_URL = 'postgres://postgres@127.0.0.1:5432/cerbanimo_e2e_guard';

    const { createDeterministicBootstrapGenerators } = await import('./ProjectBootstrapDeterministicProvider.js');
    expect(() => createDeterministicBootstrapGenerators()).toThrow(/NODE_ENV=test/);
  });

  it('refuses database names without e2e or test', async () => {
    process.env.NODE_ENV = 'test';
    process.env.CERBANIMO_E2E_MODE = 'true';
    process.env.POSTGRES_URL = 'postgres://postgres@127.0.0.1:5432/cerbanimo_dev';

    const { createDeterministicBootstrapGenerators } = await import('./ProjectBootstrapDeterministicProvider.js');
    expect(() => createDeterministicBootstrapGenerators()).toThrow(/database name containing e2e or test/);
  });

  it('returns a valid graph for e2e success mode', async () => {
    process.env.NODE_ENV = 'test';
    process.env.CERBANIMO_E2E_MODE = 'true';
    process.env.POSTGRES_URL = 'postgres://postgres@127.0.0.1:5432/cerbanimo_e2e_provider';

    const { createDeterministicBootstrapGenerators } = await import('./ProjectBootstrapDeterministicProvider.js');
    const generators = createDeterministicBootstrapGenerators();
    const result = await generators.autogeneratePlan(
      'Build a Democratic Digital Economy',
      'Description',
      ['cooperative economics'],
      null,
      '2027-01-02',
      'Outcome',
      { e2eRunId: 'unit', e2eScenario: 'success_slow' }
    );

    expect(result.tasks).toHaveLength(4);
    expect(result.tasks.some((task) => task.dependencies.length === 0)).toBe(true);
    expect(result.tasks.some((task) => task.dependencies.length > 0)).toBe(true);
    expect(result.tasks.find((task) => task.id === 'pilot-launch-readiness')?.dependencies).toEqual([
      'governance-map',
      'voting-prototype',
      'coordination-ledger'
    ]);
    expect(new Set(result.tasks.map((task) => task.automation_classification))).toEqual(new Set([
      'human_driven',
      'assisted_automation',
      'fully_automatable'
    ]));
    expect(result.tasks.find((task) => task.automation_classification === 'assisted_automation')?.required_human_inputs.length).toBeGreaterThan(0);
    expect(result.tasks.find((task) => task.automation_classification === 'fully_automatable')?.automation_requirements.capabilities).toContain('github.run_quality_checks');
  });

  it('times out once and then succeeds for retry coverage', async () => {
    process.env.NODE_ENV = 'test';
    process.env.CERBANIMO_E2E_MODE = 'true';
    process.env.POSTGRES_URL = 'postgres://postgres@127.0.0.1:5432/cerbanimo_e2e_provider';

    const { createDeterministicBootstrapGenerators } = await import('./ProjectBootstrapDeterministicProvider.js');
    const generators = createDeterministicBootstrapGenerators();
    const args = ['Name', 'Description', [], null, '2027-01-02', 'Outcome', { e2eRunId: 'retry-unit', e2eScenario: 'timeout_once_then_success' }];

    await expect(generators.autogeneratePlan(...args)).rejects.toMatchObject({
      code: 'BOOTSTRAP_PROVIDER_TIMEOUT',
      retryable: true
    });
    await expect(generators.autogeneratePlan(...args)).resolves.toMatchObject({
      tasks: expect.any(Array)
    });
  });
});
