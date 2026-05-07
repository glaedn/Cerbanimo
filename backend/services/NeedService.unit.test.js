import { describe, it, expect, vi, beforeEach } from 'vitest';
import NeedService from './NeedService.js';
import pool from '../db.js';
import * as matchingService from './matchingService.js';
import * as NotificationService from './NotificationService.js';
import EventBusService from './EventBusService.js';
import EventRouter from './EventRouter.js';

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

  it('triggers notifications for matched users through event router', async () => {
    const mockNeed = { id: 1, name: 'Match Need', requestor_user_id: 101, complexity_score: 1.0 };
    const matchedUser = { id: 202 };

    pool.query.mockResolvedValue({ rows: [mockNeed] });
    matchingService.findMatchesForNeed.mockResolvedValue({
      users: [matchedUser],
      resources: []
    });

    // Manually trigger the event router handler as it would be by the worker
    await EventRouter.handleEvent({
      eventType: 'need.created',
      entityId: mockNeed.id,
      actorId: 101
    });

    expect(NotificationService.sendNotification).toHaveBeenCalledWith(
      202,
      expect.objectContaining({ message: expect.stringContaining('Match Need') })
    );
  });

  describe('Complexity Score and Urgency', () => {
    it('calculates higher complexity for higher urgency', async () => {
      const lowNeed = { description: 'Short', urgency: 'low' };
      const highNeed = { description: 'Short', urgency: 'high' };

      const lowScore = NeedService.calculateComplexityScore(lowNeed);
      const highScore = NeedService.calculateComplexityScore(highNeed);

      expect(highScore).toBeGreaterThan(lowScore);
    });

    it('calculates critical urgency same as high for complexity', async () => {
      const highNeed = { description: 'Short', urgency: 'high' };
      const criticalNeed = { description: 'Short', urgency: 'critical' };

      const highScore = NeedService.calculateComplexityScore(highNeed);
      const criticalScore = NeedService.calculateComplexityScore(criticalNeed);

      expect(criticalScore).toEqual(highScore);
    });
  });
});
