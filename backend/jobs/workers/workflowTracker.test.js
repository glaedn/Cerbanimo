import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ query: vi.fn() }));

vi.mock('../../db.js', () => ({
  default: { query: mocks.query }
}));

import { updateWorkflowRun } from './workflowTracker.js';

describe('updateWorkflowRun', () => {
  beforeEach(() => {
    mocks.query.mockReset();
  });

  it('binds the workflow id when updating status only', async () => {
    await updateWorkflowRun(42, 'completed');

    expect(mocks.query).toHaveBeenCalledWith(expect.stringContaining('WHERE id = $2'), ['completed', 42]);
  });

  it('binds state before the workflow id when merging state', async () => {
    await updateWorkflowRun(42, 'blocked', { reason: 'needs context' });

    expect(mocks.query).toHaveBeenCalledWith(expect.stringContaining('WHERE id = $3'), [
      'blocked',
      { reason: 'needs context' },
      42
    ]);
  });
});
