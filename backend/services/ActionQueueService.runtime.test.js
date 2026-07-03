import { beforeEach, describe, expect, it, vi } from 'vitest';

const poolQuery = vi.fn();
const clientQuery = vi.fn();
const clientRelease = vi.fn();
const bossSend = vi.fn();

vi.mock('../db.js', () => ({
  default: {
    query: poolQuery,
    connect: vi.fn(async () => ({ query: clientQuery, release: clientRelease }))
  }
}));

vi.mock('../jobs/boss.js', () => ({
  default: { send: bossSend }
}));

const { default: ActionQueueService } = await import('./ActionQueueService.js');

function action(overrides = {}) {
  return {
    id: 10,
    actor_user_id: 42,
    status: 'failed',
    intent_json: { functionName: 'projects.bootstrap' },
    ...overrides
  };
}

function workflow(status) {
  return {
    id: 'wf-1',
    action_id: 10,
    actor_user_id: 42,
    workflow_type: 'projects.bootstrap',
    status
  };
}

describe('ActionQueueService runtime policies', () => {
  beforeEach(() => {
    poolQuery.mockReset();
    clientQuery.mockReset();
    clientRelease.mockReset();
    bossSend.mockReset();
  });

  it('lists only the owning actor actions for normal users', async () => {
    poolQuery.mockResolvedValueOnce({ rows: [{ id: 1, actor_user_id: 42 }] });

    const rows = await ActionQueueService.listActions({ actorUserId: 42, targetActorUserId: 7 });

    expect(rows).toHaveLength(1);
    expect(poolQuery.mock.calls[0][1][0]).toBe(42);
  });

  it('allows service actors to target a bounded actor list', async () => {
    poolQuery.mockResolvedValueOnce({ rows: [{ id: 2, actor_user_id: 7 }] });

    await ActionQueueService.listActions({ actorUserId: 42, isServiceActor: true, targetActorUserId: 7 });

    expect(poolQuery.mock.calls[0][1][0]).toBe(7);
  });

  it('never lists all actions without an actor bound', async () => {
    const rows = await ActionQueueService.listActions({ actorUserId: null, isServiceActor: true });

    expect(rows).toEqual([]);
    expect(poolQuery).not.toHaveBeenCalled();
  });

  it('rejects manual retry from running workflows', async () => {
    clientQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [action({ status: 'confirmed' })] })
      .mockResolvedValueOnce({ rows: [workflow('running')] })
      .mockResolvedValueOnce({ rows: [] });

    await expect(ActionQueueService.retryAction({ actionId: 10, actorUserId: 42 })).rejects.toMatchObject({ status: 409 });

    expect(bossSend).not.toHaveBeenCalled();
    expect(clientRelease).toHaveBeenCalled();
  });

  it('requeues retryable failed workflows without creating a second workflow', async () => {
    clientQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [action()] })
      .mockResolvedValueOnce({ rows: [workflow('failed')] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    bossSend.mockResolvedValueOnce('job-1');
    poolQuery.mockResolvedValueOnce({ rows: [action({ status: 'confirmed' })] });

    const result = await ActionQueueService.retryAction({ actionId: 10, actorUserId: 42 });

    expect(result.status).toBe('confirmed');
    expect(bossSend).toHaveBeenCalledTimes(1);
    expect(clientQuery.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO workflow_runs'))).toBe(false);
  });

  it('marks queue-send failure as blocked and retryable', async () => {
    clientQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [action()] })
      .mockResolvedValueOnce({ rows: [workflow('failed')] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    bossSend.mockRejectedValueOnce(new Error('queue offline'));
    poolQuery.mockResolvedValue({ rows: [] });

    await expect(ActionQueueService.retryAction({ actionId: 10, actorUserId: 42 })).rejects.toMatchObject({
      status: 503,
      retryable: true
    });

    expect(poolQuery.mock.calls[0][0]).toContain("SET status = 'blocked'");
    expect(poolQuery.mock.calls[1][0]).toContain("SET status = 'failed'");
  });
});
