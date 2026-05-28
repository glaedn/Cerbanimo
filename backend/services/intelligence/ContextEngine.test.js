import { describe, it, expect, vi, beforeEach } from 'vitest';
import ContextEngine from './ContextEngine.js';
import pool from '../../db.js';

vi.mock('../../db.js');

describe('ContextEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getPersonalContext should correctly map user data and skills', async () => {
    const mockUserId = 15;
    const mockUser = {
      id: 15,
      roles: ['Architect'],
      onboarding_stage: 3,
      trust_level: 5,
      skills: JSON.stringify([{ name: 'Engineering', level: 10 }, { name: 'Design', level: 8 }])
    };

    const mockMissions = [
      { id: 1, title: 'Mission 1', status: 'active' },
      { id: 2, title: 'Mission 2', status: 'completed' }
    ];

    pool.query.mockImplementation((query, params) => {
      if (query.includes('FROM users')) {
        return Promise.resolve({ rows: [mockUser] });
      }
      if (query.includes('FROM projects')) {
        return Promise.resolve({ rows: mockMissions });
      }
      return Promise.resolve({ rows: [] });
    });

    const result = await ContextEngine.getPersonalContext(mockUserId);

    expect(result.role).toBe('Architect');
    expect(result.onboarding_stage).toBe(3);
    expect(result.trustLevel).toBe(5);
    expect(result.skills).toEqual(['Engineering', 'Design']);
    expect(result.activeMissions).toHaveLength(1);
    expect(result.activeMissions[0].title).toBe('Mission 1');
  });

  it('getTemporalContext should use assigned_user_ids', async () => {
    const mockUserId = 15;
    pool.query.mockResolvedValue({ rowCount: 2, rows: [{ id: 101 }, { id: 102 }] });

    const result = await ContextEngine.getTemporalContext(mockUserId);

    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('ANY(assigned_user_ids)'),
      [mockUserId]
    );
    expect(result.recentActivityCount).toBe(2);
    expect(result.upcomingDeadlines).toHaveLength(2);
  });

  it('getSocialContext should use assigned_user_ids and communities', async () => {
    const mockUserId = 15;
    pool.query.mockImplementation((query, params) => {
      if (query.includes('unnest(assigned_user_ids)')) {
        return Promise.resolve({ rowCount: 3, rows: [{ collaborator_id: 1 }, { collaborator_id: 2 }, { collaborator_id: 3 }] });
      }
      if (query.includes('FROM communities')) {
        return Promise.resolve({ rows: [{ community_id: 10 }, { community_id: 20 }] });
      }
      return Promise.resolve({ rows: [] });
    });

    const result = await ContextEngine.getSocialContext(mockUserId);

    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('ANY(assigned_user_ids)'),
      [mockUserId]
    );
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('FROM communities WHERE $1 = ANY(members)'),
      [mockUserId]
    );
    expect(result.collaboratorCount).toBe(3);
    expect(result.activeConstellations).toHaveLength(2);
  });
});
