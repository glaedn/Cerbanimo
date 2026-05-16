import { describe, it, expect, vi, beforeEach } from 'vitest';
import pool from '../db.js';
import TokenBridgeService from './TokenBridgeService.js';
import { awardTokensInternal, deductTokensInternal } from './tokenService.js';
import TreasuryService from './TreasuryService.js';

vi.mock('../db.js', () => ({
  default: {
    query: vi.fn(),
    connect: vi.fn(),
  },
}));

vi.mock('./tokenService.js', () => ({
  awardTokensInternal: vi.fn(),
  deductTokensInternal: vi.fn(),
}));

vi.mock('./TreasuryService.js', () => ({
  default: {
    depositToTreasury: vi.fn(),
    transferFunds: vi.fn(),
  },
}));

describe('TokenBridgeService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    TokenBridgeService.flags.FORCE_OFF_CHAIN = true;
    TokenBridgeService.flags.ON_CHAIN_SETTLEMENT_ENABLED = false;
  });

  it('routes system_to_user to awardTokensInternal', async () => {
    await TokenBridgeService.routeTransaction({
      receiverId: 1,
      amount: 100,
      type: 'system_to_user',
      reason: 'test'
    });
    expect(awardTokensInternal).toHaveBeenCalledWith(pool, 1, 100, 'test', null);
  });

  it('routes user_to_user to awardTokensInternal', async () => {
    await TokenBridgeService.routeTransaction({
      senderId: 2,
      receiverId: 1,
      amount: 50,
      type: 'user_to_user',
      reason: 'gift'
    });
    expect(awardTokensInternal).toHaveBeenCalledWith(pool, 1, 50, 'gift', 2);
  });

  it('routes user_to_community to deductTokensInternal and depositToTreasury', async () => {
    deductTokensInternal.mockResolvedValue({ success: true });
    await TokenBridgeService.routeTransaction({
      senderId: 1,
      receiverId: 10,
      amount: 20,
      type: 'user_to_community',
      reason: 'donation'
    });
    expect(deductTokensInternal).toHaveBeenCalledWith(pool, 1, 20, 'donation');
    expect(TreasuryService.depositToTreasury).toHaveBeenCalledWith(10, 20, 'donation', expect.any(Object), null);
  });
});
