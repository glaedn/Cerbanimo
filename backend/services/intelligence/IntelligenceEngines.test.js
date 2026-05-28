import { describe, it, expect, vi, beforeEach } from 'vitest';
import FrictionDetectionEngine from './FrictionDetectionEngine.js';
import NarrativeInferenceEngine from './NarrativeInferenceEngine.js';
import OpportunityEngine from './OpportunityEngine.js';
import TrustInferenceEngine from './TrustInferenceEngine.js';
import pool from '../../db.js';
import { findMatchesForResource } from '../matchingService.js';

vi.mock('../../db.js');
vi.mock('../matchingService.js');

describe('Intelligence Engines Schema Compatibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('FrictionDetectionEngine', () => {
    it('should use correct columns for overdue tasks', async () => {
      pool.query.mockResolvedValue({ rowCount: 1, rows: [{ id: 1, name: 'Overdue Task' }] });
      const context = { system: { blockedMissions: [] }, emotionalState: 'calm' };

      await FrictionDetectionEngine.detectFriction(15, context);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('ANY(assigned_user_ids)'),
        expect.any(Array)
      );
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('due_date < NOW()'),
        expect.any(Array)
      );
    });
  });

  describe('NarrativeInferenceEngine', () => {
    it('should query story_summaries for content', async () => {
      pool.query.mockResolvedValue({ rowCount: 1, rows: [{ content: 'Test Narrative' }] });
      const context = { temporal: { recentActivityCount: 0 } };

      const result = await NarrativeInferenceEngine.getNarratives(15, context);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM story_summaries'),
        [15]
      );
      expect(result).toContainEqual(expect.objectContaining({ message: 'Test Narrative' }));
    });
  });

  describe('TrustInferenceEngine', () => {
    it('should use assigned_user_ids for completed tasks', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ count: '10' }] }); // completedTasks
      pool.query.mockResolvedValueOnce({}); // UPDATE users

      await TrustInferenceEngine.updateReputation(15, {});

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('ANY(assigned_user_ids)'),
        [15]
      );
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        expect.arrayContaining([2, 15]) // trustLevel 2 for 10 tasks
      );
    });
  });

  describe('OpportunityEngine', () => {
    it('should use correct columns in matchSkills', async () => {
      pool.query.mockResolvedValue({ rows: [{ id: 1, name: 'Need 1', description: 'Desc', skill_ids: [1] }] });
      const context = { personal: { skills: ['Skill 1'] } };

      await OpportunityEngine.matchSkills(15, context);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, name, description, skill_ids'),
        expect.any(Array)
      );
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('skill_ids && $1'),
        expect.any(Array)
      );
    });

    it('should use owner_user_id in matchResources', async () => {
      pool.query.mockResolvedValue({ rowCount: 1, rows: [{ id: 1, name: 'Tool' }] });
      findMatchesForResource.mockResolvedValue([{ id: 101, name: 'Need Matching Tool' }]);

      const result = await OpportunityEngine.matchResources(15, {});

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM resources WHERE owner_user_id = $1'),
        [15]
      );
      expect(findMatchesForResource).toHaveBeenCalled();
      expect(result[0].title).toBe('Need Matching Tool');
    });
  });
});
