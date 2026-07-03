import { describe, expect, it } from 'vitest';
import { normalizeJobPayload } from './projectBootstrapWorker.js';

describe('projectBootstrapWorker job payload normalization', () => {
  it('accepts pg-boss metadata job objects', () => {
    expect(normalizeJobPayload({ data: { workflowRunId: 'wf-1' } })).toEqual({ workflowRunId: 'wf-1' });
  });

  it('accepts pg-boss payload-only handler arguments', () => {
    expect(normalizeJobPayload({ workflowRunId: 'wf-2' })).toEqual({ workflowRunId: 'wf-2' });
  });
});
