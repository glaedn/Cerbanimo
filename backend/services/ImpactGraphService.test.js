import { describe, it, expect, vi, beforeEach } from 'vitest';
import ImpactGraphService from './ImpactGraphService.js';
import pool from '../db.js';

vi.mock('../db.js', () => ({
  default: {
    query: vi.fn(),
  },
}));

describe('ImpactGraphService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getOutcomes', () => {
    it('should fetch outcomes for a given project ID', async () => {
      const projectId = 1;
      const mockOutcomes = [
        { id: 1, project_id: projectId, statement: 'Outcome 1' },
        { id: 2, project_id: projectId, statement: 'Outcome 2' },
      ];

      pool.query.mockResolvedValueOnce({ rows: mockOutcomes });

      const result = await ImpactGraphService.getOutcomes(projectId);

      expect(pool.query).toHaveBeenCalledWith(
        'SELECT * FROM outcomes WHERE project_id = $1 ORDER BY id ASC',
        [projectId]
      );
      expect(result).toEqual(mockOutcomes);
    });

    it('should return an empty array if no outcomes are found', async () => {
      const projectId = 999;
      pool.query.mockResolvedValueOnce({ rows: [] });

      const result = await ImpactGraphService.getOutcomes(projectId);

      expect(result).toEqual([]);
    });
  });
});
