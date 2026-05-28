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

  it('getPersonalContext should handle empty skills', async () => {
    const mockUserId = 15;
    const mockUser = {
      id: 15,
      skills: null
    };

    pool.query.mockImplementation((query, params) => {
      if (query.includes('FROM users')) {
        return Promise.resolve({ rows: [mockUser] });
      }
      return Promise.resolve({ rows: [] });
    });

    const result = await ContextEngine.getPersonalContext(mockUserId);
    expect(result.skills).toEqual([]);
  });
});
