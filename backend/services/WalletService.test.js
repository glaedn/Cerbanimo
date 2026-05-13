import { describe, it, expect, vi, beforeEach } from 'vitest';
import pool from '../db.js';
import WalletService from './WalletService.js';

vi.mock('../db.js', () => ({
  default: {
    query: vi.fn(),
    connect: vi.fn(),
  },
}));

describe('WalletService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers a wallet for a user', async () => {
    const mockClient = {
      query: vi.fn(),
      release: vi.fn(),
    };
    pool.connect.mockResolvedValue(mockClient);
    mockClient.query.mockResolvedValue({ rows: [{ id: 1, address: '0x123' }] });

    const result = await WalletService.registerWallet({
      userId: 1,
      address: '0x123',
      chain: 'ethereum',
      walletType: 'metamask'
    });

    expect(result.address).toBe('0x123');
    expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
    expect(mockClient.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO wallets'), expect.any(Array));
    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
  });

  it('gets wallets by user', async () => {
    pool.query.mockResolvedValue({ rows: [{ address: '0x123' }] });
    const result = await WalletService.getWalletsByUser(1);
    expect(result).toHaveLength(1);
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('SELECT * FROM wallets WHERE user_id = $1'), [1]);
  });
});
