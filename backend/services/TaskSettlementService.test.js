import { afterEach, describe, expect, it, vi } from 'vitest';
import TaskAccessService from './TaskAccessService.js';
import {
  buildContributorAllocations,
  levelForXp,
  MAX_SETTLEMENT_REWARD,
  resolveSettlementPolicy,
  settlementPolicyProblem,
  TaskSettlementService,
  validateSettlementReward
} from './TaskSettlementService.js';
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

  it('preserves reward totals and stable ordering across generated party shapes', () => {
    let seed = 0x5eed1234;
    const random = () => {
      seed = (1664525 * seed + 1013904223) >>> 0;
      return seed / 0x100000000;
    };
    for (let iteration = 0; iteration < 1_000; iteration += 1) {
      const participantCount = 1 + Math.floor(random() * 50);
      const participantUserIds = Array.from({ length: participantCount }, () => 1 + Math.floor(random() * 100));
      const uniqueParticipants = [...new Set(participantUserIds)].sort((a, b) => a - b);
      const total = Math.floor(random() * (MAX_SETTLEMENT_REWARD + 1));
      const leaderUserId = uniqueParticipants[Math.floor(random() * uniqueParticipants.length)];
      const mode = iteration % 2 ? 'equal' : 'leader_weighted';
      const first = buildContributorAllocations({ total, participantUserIds, leaderUserId, mode, leaderWeight: 2 });
      const replay = buildContributorAllocations({ total, participantUserIds: [...participantUserIds].reverse(), leaderUserId, mode, leaderWeight: 2 });
      expect(first).toEqual(replay);
      expect(first.map(item => item.userId)).toEqual(uniqueParticipants);
      expect(first.every(item => Number.isSafeInteger(item.amount) && item.amount >= 0)).toBe(true);
      expect(first.reduce((sum, item) => sum + item.amount, 0)).toBe(total);
    }
  });

  it('breaks equal fractional remainders by stable user ID', () => {
    expect(buildContributorAllocations({ total: 2, participantUserIds: [3, 1, 2] })).toEqual([
      { userId: 1, amount: 1, role: 'contributor' },
      { userId: 2, amount: 1, role: 'contributor' },
      { userId: 3, amount: 0, role: 'contributor' },
    ]);
  });

  it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, MAX_SETTLEMENT_REWARD + 1])('rejects unsafe reward amount %s', (amount) => {
    expect(() => validateSettlementReward(amount)).toThrow(/whole number/);
    expect(() => buildContributorAllocations({ total: amount, participantUserIds: [1] })).toThrow(/whole number/);
  });

  it('treats a missing task reward as a blocking policy gap', () => {
    const policy = resolveSettlementPolicy({ reward_tokens: null, review_policy_snapshot: {}, task_settlement_policy: {}, project_settlement_policy: {} });
    expect(policy.rewardTokens).toBeNull();
  });

  it('classifies excessive and malformed policy snapshots as non-retryable policy gaps', () => {
    const base = resolveSettlementPolicy({ reward_tokens: 40, review_policy_snapshot: {}, task_settlement_policy: {}, project_settlement_policy: {} });
    expect(settlementPolicyProblem(base)).toBeNull();
    expect(settlementPolicyProblem({ ...base, rewardTokens: MAX_SETTLEMENT_REWARD + 1 })?.code).toBe('SETTLEMENT_REWARD_POLICY_INVALID');
    expect(settlementPolicyProblem({ ...base, rewardMode: 'invented' })?.code).toBe('SETTLEMENT_REWARD_POLICY_INVALID');
    expect(settlementPolicyProblem({ ...base, tokenType: '' })?.code).toBe('SETTLEMENT_REWARD_POLICY_INVALID');
  });

  it('uses the established nonlinear skill level curve', () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(40)).toBe(2);
    expect(levelForXp(160)).toBe(3);
  });
});

describe('TaskSettlementService authorization boundary', () => {
  afterEach(() => vi.restoreAllMocks());

  it('rolls back before reading acceptance data when direct preview access is denied', async () => {
    const client = { query: vi.fn().mockResolvedValue({ rows: [] }), release: vi.fn() };
    const database = { connect: vi.fn().mockResolvedValue(client) };
    const queue = { send: vi.fn() };
    vi.spyOn(TaskAccessService, 'assert').mockRejectedValue(Object.assign(new Error('denied'), { status: 403, code: 'TASK_AUTHORITY_REQUIRED' }));
    const service = new TaskSettlementService(database, { queue });

    await expect(service.previewForTask({ taskId: 77, authContext: { actorUserId: 9 } })).rejects.toMatchObject({ status: 403 });
    expect(client.query.mock.calls.map(([sql]) => sql)).toEqual(['BEGIN', 'ROLLBACK']);
    expect(queue.send).not.toHaveBeenCalled();
    expect(client.release).toHaveBeenCalledOnce();
  });

  it('does not hydrate reward or XP details when settlement visibility is denied', async () => {
    const database = {
      query: vi.fn().mockResolvedValueOnce({ rows: [{ id: 1, task_id: 77 }], rowCount: 1 }),
    };
    vi.spyOn(TaskAccessService, 'assert').mockRejectedValue(Object.assign(new Error('denied'), { status: 403, code: 'TASK_VISIBILITY_DENIED' }));
    const service = new TaskSettlementService(database, { queue: { send: vi.fn() } });

    await expect(service.hydrate('settlement-id', { actorUserId: 9 })).rejects.toMatchObject({ status: 403 });
    expect(database.query).toHaveBeenCalledOnce();
  });
});
