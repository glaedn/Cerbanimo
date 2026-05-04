import { describe, it, expect, vi, beforeEach } from 'vitest';
import NeedService from './NeedService.js';
import pool from '../db.js';
import * as matchingService from './matchingService.js';
import * as NotificationService from './NotificationService.js';

vi.mock('../db.js');
vi.mock('./matchingService.js');
vi.mock('./NotificationService.js');

describe('NeedService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('successfully creates a need', async () => {
    const mockNeed = { id: 1, name: 'Test Need', requestor_user_id: 101 };
    pool.query.mockResolvedValue({ rows: [mockNeed] });
    matchingService.findMatchesForNeed.mockResolvedValue({ users: [], resources: [] });

    const data = { name: 'Test Need', requestor_user_id: 101 };
    const result = await NeedService.createNeed(data);

    expect(result).toEqual(mockNeed);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO needs'),
      expect.arrayContaining(['Test Need', 101])
    );
  });

  it('throws error if name is missing', async () => {
    await expect(NeedService.createNeed({ requestor_user_id: 101 }))
      .rejects.toThrow('Need name is required.');
  });

  it('triggers notifications for matched users', async () => {
    const mockNeed = { id: 1, name: 'Match Need', requestor_user_id: 101 };
    const matchedUser = { id: 202 };

    pool.query.mockResolvedValue({ rows: [mockNeed] });
    matchingService.findMatchesForNeed.mockResolvedValue({
      users: [matchedUser],
      resources: []
    });

    await NeedService.createNeed({ name: 'Match Need', requestor_user_id: 101 });

    // Wait for the async processMatches to run
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(NotificationService.sendNotification).toHaveBeenCalledWith(
      202,
      expect.objectContaining({ message: expect.stringContaining('Match Need') })
    );
  });
});
