import TaskRoutingService from './TaskRoutingService.js';
import { vi, describe, it, expect } from 'vitest';
import pool from '../db.js';

vi.mock('../db.js', () => ({
  default: {
    query: vi.fn()
  }
}));

describe('TaskRoutingService', () => {
  describe('getMatchingTasksForUser', () => {
    it('should return an empty array if the user is not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const result = await TaskRoutingService.getMatchingTasksForUser(123);
      expect(result).toEqual([]);
      expect(pool.query).toHaveBeenCalledWith('SELECT skills FROM users WHERE id = $1', [123]);
    });

    it('should return matching tasks if the user exists (handles skill objects)', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ skills: [{ id: 1, name: 'Skill 1' }, { id: 2, name: 'Skill 2' }] }] }) // User query
        .mockResolvedValueOnce({ rows: [{ id: 1, name: 'Task 1' }] }); // Matching tasks query

      const result = await TaskRoutingService.getMatchingTasksForUser(123);
      expect(result).toEqual([{ id: 1, name: 'Task 1' }]);
      expect(pool.query).toHaveBeenLastCalledWith(expect.stringContaining('WHERE (t.skill_id = ANY($2::int[]) OR t.skill_id IS NULL)'), [123, [1, 2], '%unassigned']);
    });

    it('should return matching tasks if the user exists (handles skill IDs)', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ skills: [1, 2] }] }) // User query
        .mockResolvedValueOnce({ rows: [{ id: 1, name: 'Task 1' }] }); // Matching tasks query

      const result = await TaskRoutingService.getMatchingTasksForUser(123);
      expect(result).toEqual([{ id: 1, name: 'Task 1' }]);
      expect(pool.query).toHaveBeenLastCalledWith(expect.stringContaining('WHERE (t.skill_id = ANY($2::int[]) OR t.skill_id IS NULL)'), [123, [1, 2], '%unassigned']);
    });
  });
});
