import { describe, expect, it } from 'vitest';

describe('project bootstrap imports', () => {
  it('imports project route and generator modules without optional frontend-only dependencies', async () => {
    const [projectRoutes, taskGenerator, bootstrapService] = await Promise.all([
      import('./projects.js'),
      import('../services/taskGenerator.js'),
      import('../services/ProjectBootstrapService.js')
    ]);

    expect(projectRoutes.default).toBeTruthy();
    expect(taskGenerator.autogeneratePlan).toBeTypeOf('function');
    expect(bootstrapService.default.bootstrapFromWorkflow).toBeTypeOf('function');
  });
});
