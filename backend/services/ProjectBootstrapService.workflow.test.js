import { describe, expect, it, vi } from 'vitest';
import { BOOTSTRAP_STEPS, ProjectBootstrapService, ensureDependencyAwareGraph } from './ProjectBootstrapService.js';

function fakePool(responses = []) {
  const query = vi.fn(async () => {
    const next = responses.shift();
    if (next instanceof Error) throw next;
    return next || { rows: [] };
  });
  return { query };
}

function generatedTask(overrides = {}) {
  return {
    id: overrides.taskKey || overrides.id || 'task-1',
    taskKey: overrides.taskKey || overrides.id || 'task-1',
    name: overrides.name || 'Define scope',
    description: overrides.description || 'Define one verifiable deliverable and acceptance boundary.',
    skill_name: overrides.skill_name || 'Project Planning',
    dependencies: overrides.dependencies || [],
    dependsOn: overrides.dependsOn || overrides.dependencies || [],
    start_date: overrides.start_date || '2026-08-01T00:00:00.000Z',
    due_date: overrides.due_date || '2026-08-05T00:00:00.000Z',
    impact_weight: overrides.impact_weight ?? 100,
    automation_classification: overrides.automation_classification || 'human_driven',
    automation_confidence: overrides.automation_confidence ?? 0.8,
    automation_rationale: overrides.automation_rationale || 'This task requires accountable human planning.',
    required_human_inputs: overrides.required_human_inputs || [],
    automation_requirements: overrides.automation_requirements || {},
    validation_requirements: overrides.validation_requirements || [
      {
        requirementId: `${overrides.taskKey || overrides.id || 'task-1'}-proof`,
        description: 'Evidence shows the deliverable is complete.',
        proofTypes: ['document'],
        checks: ['human_review']
      }
    ],
    ...overrides
  };
}

describe('ProjectBootstrapService workflow durability', () => {
  it('places task refinement before graph validation and persistence', () => {
    expect(BOOTSTRAP_STEPS.indexOf('refineTaskGraph')).toBeGreaterThan(BOOTSTRAP_STEPS.indexOf('generateTaskGraph'));
    expect(BOOTSTRAP_STEPS.indexOf('refineTaskGraph')).toBeLessThan(BOOTSTRAP_STEPS.indexOf('validateTaskGraph'));
    expect(BOOTSTRAP_STEPS.indexOf('validateTaskGraph')).toBeLessThan(BOOTSTRAP_STEPS.indexOf('persistProjectGraph'));
  });

  it('refines vague generated tasks with project outcome and plan context', async () => {
    const initialTasks = [
      {
        id: 1,
        name: 'Launch the whole meetup',
        description: 'Do all of the planning, outreach, scheduling, and launch work.',
        skill_name: 'Project Management',
        dependencies: [],
        start_date: '2026-08-01T00:00:00.000Z',
        due_date: '2026-08-30T00:00:00.000Z',
        impact_weight: 100
      }
    ];
    const refineGeneratedTaskGraph = vi.fn(async () => ({
      refinementSummary: {
        splitTaskIds: [1],
        deletedTaskIds: [],
        addedTaskNames: ['Define meetup format', 'Reserve meetup venue'],
        rationale: 'Split one broad launch task into discrete setup and delivery tasks.'
      },
      tasks: [
        {
          taskKey: 'define-meetup-format',
          id: 'define-meetup-format',
          dependsOn: [],
          name: 'Define meetup format',
          description: 'Write the recurring meetup format, target audience, and success criteria.',
          skill_name: 'Community Planning',
          dependencies: [],
          start_date: '2026-08-01T00:00:00.000Z',
          due_date: '2026-08-05T00:00:00.000Z',
          impact_weight: 45
        },
        {
          taskKey: 'reserve-meetup-venue',
          id: 'reserve-meetup-venue',
          dependsOn: ['define-meetup-format'],
          name: 'Reserve meetup venue',
          description: 'Confirm a venue and weekly time slot for the first month of meetups.',
          skill_name: 'Event Coordination',
          start_date: '2026-08-06T00:00:00.000Z',
          due_date: '2026-08-12T00:00:00.000Z',
          impact_weight: 55
        }
      ],
      changes: [
        {
          operation: 'split',
          sourceTaskKeys: ['launch-the-whole-meetup'],
          resultTaskKeys: ['define-meetup-format', 'reserve-meetup-venue'],
          reason: 'The original task contained multiple independently assignable outcomes.'
        }
      ]
    }));
    const service = new ProjectBootstrapService({ pool: fakePool(), generators: { refineGeneratedTaskGraph } });
    const input = {
      name: 'Watertown Weekly MtG Meetup',
      description: 'Create a local weekly Magic: The Gathering meetup in Watertown.',
      outcomeStatement: 'Build a local community around weekly MtG meetups.',
      tags: ['community', 'games'],
      dueDate: '2026-08-30T00:00:00.000Z'
    };

    const refined = await service.refineTaskGraph(input, {
      projectPlan: 'Start by defining the meetup, then secure a venue and launch outreach.',
      tasks: initialTasks
    });

    expect(refineGeneratedTaskGraph).toHaveBeenCalledTimes(1);
    const call = refineGeneratedTaskGraph.mock.calls[0];
    expect(call[0]).toBe(input.name);
    expect(call[5]).toBe(input.outcomeStatement);
    expect(call[6].projectPlan).toContain('Start by defining');
    expect(call[6].tasks).toBe(initialTasks);
    expect(refined.tasks).toHaveLength(2);
    expect(refined.taskGraphRefinement).toMatchObject({
      applied: true,
      originalTaskCount: 1,
      refinedTaskCount: 2
    });
    expect(refined.taskGraphRefinement.changes[0]).toMatchObject({
      operation: 'split',
      sourceTaskKeys: ['launch-the-whole-meetup']
    });
    const validation = service.validateGeneratedGraph(refined, input);
    expect(validation.valid).toBe(true);
    expect(validation.tasks[1].dependencies).toEqual(['define-meetup-format']);
  });

  it('falls back to the original graph when the refinement provider omits the final task list', async () => {
    const service = new ProjectBootstrapService({
      pool: fakePool(),
      generators: { refineGeneratedTaskGraph: vi.fn(async () => ({ refinementSummary: { rationale: 'bad output' } })) }
    });

    const refined = await service.refineTaskGraph(
      { name: 'Project', description: 'Desc', outcomeStatement: 'Outcome', tags: [] },
      { tasks: [generatedTask({ id: 'original-task', taskKey: undefined })] }
    );

    expect(refined.tasks[0].id).toBe('original-task');
    expect(refined.taskGraphRefinement).toMatchObject({
      applied: false,
      failed: true,
      fallbackToOriginal: true
    });
  });

  it('runs a second bounded pass for repairable structural refinement failures', async () => {
    const refineGeneratedTaskGraph = vi
      .fn()
      .mockResolvedValueOnce({
        tasks: [
          generatedTask({ taskKey: 'write-spec', id: 'write-spec', dependsOn: ['missing-task'], dependencies: ['missing-task'] })
        ],
        changes: []
      })
      .mockResolvedValueOnce({
        tasks: [
          generatedTask({ taskKey: 'define-scope', id: 'define-scope', dependsOn: [], dependencies: [], impact_weight: 40 }),
          generatedTask({
            taskKey: 'write-spec',
            id: 'write-spec',
            dependsOn: ['define-scope'],
            dependencies: ['define-scope'],
            start_date: '2026-08-06T00:00:00.000Z',
            due_date: '2026-08-10T00:00:00.000Z',
            impact_weight: 60
          })
        ],
        changes: [
          {
            operation: 'add',
            sourceTaskKeys: [],
            resultTaskKeys: ['define-scope'],
            reason: 'Added the missing prerequisite.'
          }
        ]
      });
    const service = new ProjectBootstrapService({ pool: fakePool(), generators: { refineGeneratedTaskGraph } });

    const refined = await service.refineTaskGraph(
      { name: 'Project', description: 'Desc', outcomeStatement: 'Outcome', tags: [] },
      { tasks: [generatedTask({ id: 'write-spec', taskKey: 'write-spec' })] }
    );

    expect(refineGeneratedTaskGraph).toHaveBeenCalledTimes(2);
    expect(refineGeneratedTaskGraph.mock.calls[1][6].previousFindings.length).toBeGreaterThan(0);
    expect(refined.taskGraphRefinement).toMatchObject({ applied: true, pass: 2 });
    expect(refined.tasks[1].dependencies).toEqual(['define-scope']);
  });

  it('falls back when refinement exceeds task-count growth limits', async () => {
    const refineGeneratedTaskGraph = vi.fn(async () => ({
      tasks: Array.from({ length: 8 }, (_, index) => generatedTask({
        taskKey: `tiny-task-${index + 1}`,
        id: `tiny-task-${index + 1}`,
        name: `Tiny task ${index + 1}`,
        impact_weight: 1
      })),
      changes: []
    }));
    const service = new ProjectBootstrapService({
      pool: fakePool(),
      generators: { refineGeneratedTaskGraph },
      refinementLimits: { maxTasks: 4, maxTaskGrowthPercent: 50, minMegaTaskExpansionBuffer: 0 }
    });

    const refined = await service.refineTaskGraph(
      { name: 'Project', description: 'Desc', outcomeStatement: 'Outcome', tags: [] },
      { tasks: [generatedTask({ taskKey: 'mega-task', id: 'mega-task' })] }
    );

    expect(refined.tasks).toHaveLength(1);
    expect(refined.taskGraphRefinement).toMatchObject({
      applied: false,
      fallbackToOriginal: true
    });
  });

  it('falls back when refinement returns duplicate stable task keys', async () => {
    const service = new ProjectBootstrapService({
      pool: fakePool(),
      generators: {
        refineGeneratedTaskGraph: vi.fn(async () => ({
          tasks: [
            generatedTask({ taskKey: 'same-key', id: 'same-key' }),
            generatedTask({ taskKey: 'same-key', id: 'same-key', name: 'Duplicate key task' })
          ],
          changes: []
        }))
      }
    });

    const refined = await service.refineTaskGraph(
      { name: 'Project', description: 'Desc', outcomeStatement: 'Outcome', tags: [] },
      { tasks: [generatedTask({ taskKey: 'original', id: 'original' })] }
    );

    expect(refined.tasks[0].id).toBe('original');
    expect(refined.taskGraphRefinement.error.message).toContain('Duplicate refined taskKey');
  });

  it('falls back when the refinement provider times out', async () => {
    const service = new ProjectBootstrapService({
      pool: fakePool(),
      generators: {
        refineGeneratedTaskGraph: vi.fn(async () => {
          throw new Error('Gemini request timed out after 60000ms');
        })
      }
    });

    const refined = await service.refineTaskGraph(
      { name: 'Project', description: 'Desc', outcomeStatement: 'Outcome', tags: [] },
      { tasks: [generatedTask({ taskKey: 'original', id: 'original' })] }
    );

    expect(refined.taskGraphRefinement).toMatchObject({
      applied: false,
      fallbackToOriginal: true
    });
    expect(refined.taskGraphRefinement.error.message).toContain('timed out');
  });

  it('preserves an already discrete graph with minimal churn', async () => {
    const discreteTasks = [
      generatedTask({ taskKey: 'define-scope', id: 'define-scope', impact_weight: 40 }),
      generatedTask({
        taskKey: 'write-spec',
        id: 'write-spec',
        dependsOn: ['define-scope'],
        dependencies: ['define-scope'],
        start_date: '2026-08-06T00:00:00.000Z',
        due_date: '2026-08-10T00:00:00.000Z',
        impact_weight: 60
      })
    ];
    const service = new ProjectBootstrapService({
      pool: fakePool(),
      generators: {
        refineGeneratedTaskGraph: vi.fn(async () => ({
          tasks: discreteTasks,
          changes: [],
          refinementSummary: {
            splitTaskIds: [],
            deletedTaskIds: [],
            addedTaskNames: [],
            rationale: 'No material changes were needed.'
          }
        }))
      }
    });

    const refined = await service.refineTaskGraph(
      { name: 'Project', description: 'Desc', outcomeStatement: 'Outcome', tags: [] },
      { tasks: discreteTasks }
    );

    expect(refined.tasks.map((task) => task.id)).toEqual(['define-scope', 'write-spec']);
    expect(refined.taskGraphRefinement.changes).toEqual([]);
  });

  it('atomically claims a queued workflow and records the claim', async () => {
    const workflow = {
      id: 'wf-1',
      action_id: 5,
      actor_user_id: 42,
      attempt_count: 1,
      lease_expires_at: '2026-07-02T20:00:00.000Z'
    };
    const pool = fakePool([{ rows: [workflow] }, { rows: [] }]);
    const service = new ProjectBootstrapService({ pool });

    const claim = await service.claimWorkflow('wf-1');

    expect(claim.claimed).toBe(true);
    expect(claim.workflow).toBe(workflow);
    expect(pool.query.mock.calls[0][0]).toContain("status IN ('queued', 'retry_wait', 'running')");
    expect(pool.query.mock.calls[1][1][1]).toBe('workflow.claimed');
  });

  it('rejects duplicate delivery while another worker owns the lease', async () => {
    const workflow = {
      id: 'wf-1',
      action_id: 5,
      actor_user_id: 42,
      status: 'running',
      attempt_count: 1,
      lease_expires_at: '2026-07-02T20:00:00.000Z'
    };
    const pool = fakePool([{ rows: [] }, { rows: [workflow] }, { rows: [] }]);
    const service = new ProjectBootstrapService({ pool });

    const claim = await service.claimWorkflow('wf-1');

    expect(claim.claimed).toBe(false);
    expect(claim.workflow).toBe(workflow);
    expect(pool.query.mock.calls[2][1][1]).toBe('workflow.claim_rejected');
  });

  it('upserts a completed step instead of adding duplicate logical rows', async () => {
    const pool = fakePool([{ rows: [{ id: 'wf-1' }] }, { rows: [] }]);
    const service = new ProjectBootstrapService({ pool });

    await service.completeStep('wf-1', 'validateInput', { ok: true }, 'completed', 'token-1');

    expect(pool.query.mock.calls[1][0]).toContain('ON CONFLICT (workflow_run_id, step_name)');
  });

  it('rejects stale claim tokens during lease renewal', async () => {
    const pool = fakePool([{ rows: [] }]);
    const service = new ProjectBootstrapService({ pool });

    await expect(service.renewLease('wf-1', 'stale-token', 'generateTaskGraph')).rejects.toMatchObject({
      code: 'BOOTSTRAP_CLAIM_LOST'
    });
  });

  it('marks retryable failures retry_wait before exhausting attempts', async () => {
    const workflow = { id: 'wf-1', action_id: 5, actor_user_id: 42, attempt_count: 1 };
    const pool = fakePool([{ rows: [] }, { rows: [] }]);
    const service = new ProjectBootstrapService({ pool });
    const error = new Error('provider timeout');
    error.code = 'BOOTSTRAP_PROVIDER_TIMEOUT';
    error.stage = 'generateTaskGraph';
    error.retryable = true;

    await expect(service.failWorkflow(workflow, error)).rejects.toThrow('provider timeout');

    expect(pool.query.mock.calls[0][1][0]).toBe('retry_wait');
    expect(pool.query.mock.calls[1][1][1]).toBe('workflow.retry_scheduled');
  });

  it('blocks non-retryable graph failures', async () => {
    const workflow = { id: 'wf-1', action_id: 5, actor_user_id: 42, attempt_count: 1 };
    const pool = fakePool([{ rows: [] }, { rows: [] }]);
    const service = new ProjectBootstrapService({ pool });
    const error = new Error('invalid graph');
    error.code = 'BOOTSTRAP_GRAPH_INVALID';
    error.stage = 'validateTaskGraph';

    const result = await service.failWorkflow(workflow, error);

    expect(result.code).toBe('BOOTSTRAP_GRAPH_INVALID');
    expect(pool.query.mock.calls[0][1][0]).toBe('blocked');
    expect(pool.query.mock.calls[2][1][1]).toBe('action.failed');
  });

  it('locks action then workflow and writes project relation inside persistence transaction', async () => {
    const client = {
      query: vi.fn(async (sql) => {
        const text = String(sql);
        if (text.includes('FROM api_actions')) return { rows: [{ id: 5, status: 'confirmed' }] };
        if (text.includes('FROM workflow_runs')) return { rows: [{ id: 'wf-1', status: 'running', claim_token: 'token-1', related_project_id: null }] };
        if (text.includes('INSERT INTO projects')) return { rows: [{ id: 100, name: 'Project' }] };
        if (text.includes('SELECT id FROM skills')) return { rows: [{ id: 9 }] };
        if (text.includes('INSERT INTO tasks')) return { rows: [{ id: 200, dependencies: [] }] };
        if (text.includes('UPDATE workflow_runs SET related_project_id')) return { rows: [{ id: 'wf-1' }] };
        return { rows: [] };
      })
    };
    const impactGraphService = {
      createOutcome: vi.fn(async () => ({})),
      createTaskImpactNodesForProject: vi.fn(async () => [])
    };
    const service = new ProjectBootstrapService({ pool: fakePool(), impactGraphService });

    await service.persistGeneratedGraph(
      client,
      42,
      { name: 'Project', description: 'Desc', outcomeStatement: 'Outcome', tags: [] },
      { projectPlan: 'Plan', tasks: [{ id: 1, name: 'Task', description: 'Desc', skill_name: 'Ops', dependencies: [] }] },
      { workflowRunId: 'wf-1', actionId: 5, claimToken: 'token-1' }
    );

    expect(client.query.mock.calls[0][0]).toContain('FROM api_actions');
    expect(client.query.mock.calls[0][0]).toContain('FOR UPDATE');
    expect(client.query.mock.calls[1][0]).toContain('FROM workflow_runs');
    expect(client.query.mock.calls[1][0]).toContain('FOR UPDATE');
    expect(client.query.mock.calls.some(([sql]) => String(sql).includes('UPDATE workflow_runs SET related_project_id'))).toBe(true);
    expect(client.query.mock.calls.some(([sql]) => String(sql).includes('UPDATE api_actions SET related_project_id'))).toBe(true);
  });

  it('resolves generated dependencies after inserting DB task rows', async () => {
    let nextTaskId = 200;
    const client = {
      query: vi.fn(async (sql) => {
        const text = String(sql);
        if (text.includes('SELECT id FROM skills')) return { rows: [{ id: 9 }] };
        if (text.includes('INSERT INTO tasks')) return { rows: [{ id: nextTaskId++, dependencies: [] }] };
        return { rows: [] };
      })
    };
    const service = new ProjectBootstrapService({ pool: fakePool() });

    await service.insertTasks(client, 42, 100, [
      { id: 'research', name: 'Research', description: 'Desc', skill_name: 'Ops', dependencies: [] },
      { id: 'launch', name: 'Launch', description: 'Desc', skill_name: 'Ops', dependencies: ['research'] }
    ]);

    const dependencyUpdates = client.query.mock.calls.filter(([sql]) => String(sql).includes('UPDATE tasks SET dependencies'));
    expect(dependencyUpdates).toHaveLength(2);
    expect(dependencyUpdates[0][1]).toEqual([[], 200]);
    expect(dependencyUpdates[1][1]).toEqual([[200], 201]);
  });

  it('infers a downstream dependency when a model returns an all-root graph', () => {
    const result = ensureDependencyAwareGraph({
      tasks: [
        { id: 1, name: 'Research', due_date: '2026-08-01T00:00:00.000Z', dependencies: [] },
        { id: 2, name: 'Prototype', due_date: '2026-08-05T00:00:00.000Z', dependencies: [] },
        { id: 3, name: 'Launch', start_date: '2026-08-02T00:00:00.000Z', due_date: '2026-08-03T00:00:00.000Z', dependencies: [] }
      ]
    });

    expect(result.dependencyInference.applied).toBe(true);
    expect(result.tasks[2].dependencies).toEqual([1, 2]);
    expect(new Date(result.tasks[2].start_date).getTime()).toBeGreaterThan(new Date('2026-08-05T00:00:00.000Z').getTime());
    expect(new Date(result.tasks[2].due_date).getTime()).toBeGreaterThan(new Date(result.tasks[2].start_date).getTime());
  });
});
