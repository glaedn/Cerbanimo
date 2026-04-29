import { describe, it, expect, vi, beforeEach } from 'vitest';
import pool from '../db.js';
import WeeklyWrapUpService from './WeeklyWrapUpService.js';

vi.mock('../db.js', () => ({
  default: {
    query: vi.fn(),
  },
}));

describe('WeeklyWrapUpService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserWeeklyStats', () => {
    it('should return null if no stats are found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });
      const stats = await WeeklyWrapUpService.getUserWeeklyStats(1);
      expect(stats).toBeNull();
    });

    it('should calculate averages and gather skill data', async () => {
      // Mock statsQuery result
      pool.query.mockResolvedValueOnce({
        rows: [{
          tasks_this_week: 5,
          xp_this_week: 500,
          tasks_last_week: 3,
          xp_last_week: 300,
          total_tasks_6m: 100,
          total_xp_6m: 10000,
          weeks_elapsed: 10
        }]
      });

      // Mock skillStatsRes result
      pool.query.mockResolvedValueOnce({
        rows: [{
          skill_id: 10,
          skill_name: 'Coding',
          unlocked_users: [{ user_id: 1, level: 3 }],
          avg_task_skill_level: 5.5,
          tasks_count: 2
        }]
      });

      const stats = await WeeklyWrapUpService.getUserWeeklyStats(1);

      expect(stats).toEqual({
        user_id: 1,
        tasks: {
          this_week: 5,
          last_week: 3,
          avg_6_months: 10
        },
        xp: {
          this_week: 500,
          last_week: 300,
          avg_6_months: 1000
        },
        skills: [{
          skill_id: 10,
          skill_name: 'Coding',
          skill_level_achieved: 3,
          avg_task_level_this_week: 5.5,
          tasks_completed_count: 2
        }]
      });
    });
  });
});
