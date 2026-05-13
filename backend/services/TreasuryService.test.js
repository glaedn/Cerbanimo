import { describe, it, expect, vi, beforeEach } from 'vitest';
import pool from '../db.js';
import TreasuryService from './TreasuryService.js';

vi.mock('../db.js', () => ({
  default: {
    query: vi.fn(),
    connect: vi.fn(),
  },
}));

describe('TreasuryService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('gets an existing treasury', async () => {
    const mockTreasury = { id: 1, community_id: 1, cotoken_balance: 100 };
    pool.query.mockResolvedValueOnce({ rows: [mockTreasury] });

    const result = await TreasuryService.getTreasury(1);

    expect(result).toEqual(mockTreasury);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('SELECT * FROM community_treasury'),
      [1]
    );
  });

  it('initializes a treasury if it does not exist', async () => {
    const mockTreasury = { id: 1, community_id: 2, cotoken_balance: 0 };
    pool.query
      .mockResolvedValueOnce({ rows: [] }) // getTreasury (check)
      .mockResolvedValueOnce({ rows: [mockTreasury] }); // getTreasury (init)

    const result = await TreasuryService.getTreasury(2);

    expect(result).toEqual(mockTreasury);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO community_treasury'),
      [2]
    );
  });

  it('deposits to treasury', async () => {
    const mockClient = {
      query: vi.fn(),
      release: vi.fn(),
    };
    pool.connect.mockResolvedValue(mockClient);

    // Initial getTreasury call uses pool.query if externalClient is not provided
    // but wait, TreasuryService.depositToTreasury calls this.getTreasury(communityId, client, true)
    // where client is the newly connected mockClient.

    mockClient.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: 1, community_id: 1 }] }) // getTreasury (check)
      .mockResolvedValueOnce({ rows: [] }) // UPDATE
      .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // recordTransaction
      .mockResolvedValueOnce({ rows: [] }); // COMMIT

    const result = await TreasuryService.depositToTreasury(1, 50, 'test_deposit');

    expect(result.success).toBe(true);
    expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
    expect(mockClient.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE community_treasury SET cotoken_balance = cotoken_balance + $1'),
      [50, 1]
    );
    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
  });
});
