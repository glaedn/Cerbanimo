import { describe, expect, it } from 'vitest';
import { normalizeAutomationJobPayload } from './automationWorker.js';

describe('automationWorker job payload normalization', () => {
  it('accepts pg-boss object, data, and batch payload shapes', () => {
    const payload = { automationRunId: 42, templateKey: 'run_quality_checks' };

    expect(normalizeAutomationJobPayload({ data: payload })).toEqual(payload);
    expect(normalizeAutomationJobPayload(payload)).toEqual(payload);
    expect(normalizeAutomationJobPayload([{ data: payload }])).toEqual(payload);
  });
});
