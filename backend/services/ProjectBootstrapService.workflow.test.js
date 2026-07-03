import { describe, expect, it, vi } from 'vitest';
import { ProjectBootstrapService } from './ProjectBootstrapService.js';

function fakePool(responses = []) {
  const query = vi.fn(async () => {
    const next = responses.shift();
    if (next instanceof Error) throw next;
    return next || { rows: [] };
  });
  return { query };
}

describe('ProjectBootstrapService workflow durability', () => {
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
    const pool = fakePool([{ rows: [] }]);
    const service = new ProjectBootstrapService({ pool });

    await service.completeStep('wf-1', 'validateInput', { ok: true });

    expect(pool.query).toHaveBeenCalledTimes(1);
    expect(pool.query.mock.calls[0][0]).toContain('ON CONFLICT (workflow_run_id, step_name)');
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
});
