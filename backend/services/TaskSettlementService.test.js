import { describe, expect, it } from 'vitest';
import { buildContributorAllocations, levelForXp, resolveSettlementPolicy } from './TaskSettlementService.js';
import { normalizeSettlementJobPayload } from '../jobs/workers/taskSettlementWorker.js';

describe('TaskSettlementService pure policy rules', () => {
  it('normalizes pg-boss batch payloads before settlement', () => {
    expect(normalizeSettlementJobPayload([{ data: { settlementId: 42 } }])).toEqual({ settlementId: 42 });
  });
  it('splits the authoritative reward exactly and deterministically', () => {
    const rewards = buildContributorAllocations({ total: 40, participantUserIds: [3, 1, 2] });
    expect(rewards.reduce((sum, reward) => sum + reward.amount, 0)).toBe(40);
    expect(rewards.map(reward => reward.userId)).toEqual([1, 2, 3]);
  });

  it('supports an explicitly nominated party leader without minting extra value', () => {
    const rewards = buildContributorAllocations({ total: 100, participantUserIds: [1, 2, 3], leaderUserId: 2, mode: 'leader_weighted', leaderWeight: 2 });
    expect(rewards.reduce((sum, reward) => sum + reward.amount, 0)).toBe(100);
    expect(rewards.find(reward => reward.userId === 2)?.amount).toBe(50);
  });

  it('treats a missing task reward as a blocking policy gap', () => {
    const policy = resolveSettlementPolicy({ reward_tokens: null, review_policy_snapshot: {}, task_settlement_policy: {}, project_settlement_policy: {} });
    expect(policy.rewardTokens).toBeNull();
  });

  it('uses the established nonlinear skill level curve', () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(40)).toBe(2);
    expect(levelForXp(160)).toBe(3);
  });
});
