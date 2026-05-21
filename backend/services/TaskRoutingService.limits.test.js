import TaskRoutingService from './TaskRoutingService.js';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import pool from '../db.js';
import { sendNotification } from './NotificationService.js';

vi.mock('../db.js', () => ({
  default: {
    query: vi.fn()
  }
}));

vi.mock('./NotificationService.js', () => ({
  sendNotification: vi.fn()
}));

describe('TaskRoutingService Notification Limits', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('notifyMatchingUsers', () => {
    it('should limit notifications to 5 users per task', async () => {
      // Mock candidates
      const candidates = [];
      for (let i = 1; i <= 10; i++) {
        candidates.push({ id: i, skills: [{ id: 1 }], interests: [], current_assignments: 0 });
      }

      pool.query
        .mockResolvedValueOnce({ rows: candidates }) // Candidates query
        .mockResolvedValue({ rows: [{ count: 0 }] }); // Daily limit check loop (multiple calls)

      const task = { id: 101, name: 'Test Task', skill_id: 1, project_tags: [] };

      await TaskRoutingService.notifyMatchingUsers(task);

      expect(sendNotification).toHaveBeenCalledTimes(5);
    });

    it('should skip users who reached their daily limit of 3 notifications', async () => {
      const candidates = [
        { id: 1, skills: [{ id: 1 }], interests: [], current_assignments: 0 },
        { id: 2, skills: [{ id: 1 }], interests: [], current_assignments: 0 }
      ];

      pool.query
        .mockResolvedValueOnce({ rows: candidates }) // Candidates query
        .mockResolvedValueOnce({ rows: [{ count: 3 }] }) // User 1 daily count (limit reached)
        .mockResolvedValueOnce({ rows: [{ count: 0 }] }); // User 2 daily count

      const task = { id: 101, name: 'Test Task', skill_id: 1, project_tags: [] };

      await TaskRoutingService.notifyMatchingUsers(task);

      expect(sendNotification).toHaveBeenCalledTimes(1);
      expect(sendNotification).toHaveBeenCalledWith(2, expect.anything());
    });

    it('should rank users by interest matches', async () => {
       const candidates = [
        { id: 1, skills: [{ id: 1 }], interests: [{name: 'Tag1'}], current_assignments: 0 },
        { id: 2, skills: [{ id: 1 }], interests: [{name: 'Tag1'}, {name: 'Tag2'}], current_assignments: 0 }
      ];

      pool.query
        .mockResolvedValueOnce({ rows: candidates }) // Candidates query
        .mockResolvedValueOnce({ rows: [{ count: 0 }] }) // User 1 daily count
        .mockResolvedValueOnce({ rows: [{ count: 0 }] }); // User 2 daily count

      const task = { id: 101, name: 'Test Task', skill_id: 1, project_tags: ['Tag1', 'Tag2'] };

      await TaskRoutingService.notifyMatchingUsers(task);

      expect(sendNotification).toHaveBeenCalledTimes(2);
      expect(sendNotification.mock.calls[0][0]).toBe(2);
      expect(sendNotification.mock.calls[1][0]).toBe(1);
    });
  });
});
