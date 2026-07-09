import { describe, expect, it } from 'vitest';
import TaskReviewPolicyService from './TaskReviewPolicyService.js';

describe('TaskReviewPolicyService', () => {
  it('uses three peer Blessings by default', () => {
    expect(TaskReviewPolicyService.defaultPolicy().peerApprovalsRequired).toBe(3);
  });

  it('classifies sensitive and high-stakes review tiers deterministically', () => {
    expect(TaskReviewPolicyService.riskTierFor({ task: { description: 'Private interview notes' } })).toBe('sensitive');
    expect(TaskReviewPolicyService.riskTierFor({ task: { description: 'Legal public communication approval' } })).toBe('high_stakes');
  });

  it('does not allow high-stakes timeout advancement', () => {
    const round = { risk_tier: 'high_stakes', policy_snapshot: TaskReviewPolicyService.defaultPolicy() };
    expect(TaskReviewPolicyService.canPeerTimeoutAdvance(round)).toBe(false);
    expect(TaskReviewPolicyService.canPmTimeoutAdvance(round)).toBe(false);
  });
});
