import { describe, expect, it, vi } from 'vitest';
import { getActorProgression, normalizeActorSkillRefs } from './ActorProgressionService.js';

describe('ActorProgressionService', () => {
  it('parses mixed user skill references and removes duplicate ids', () => {
    expect(normalizeActorSkillRefs([
      '{"id":555,"name":"Customer Service"}',
      { id: 812, name: 'Web Development' },
      '555',
      null,
      'not-json'
    ])).toEqual([
      { id: 555, name: 'Customer Service' },
      { id: 812, name: 'Web Development' }
    ]);
  });

  it('returns the signed actor authoritative level and XP from unlocked_users', async () => {
    const db = {
      query: vi.fn().mockResolvedValue({
        rows: [
          {
            id: 555,
            name: 'Customer Service',
            unlocked_users: [
              { user_id: 4, level: 2, exp: 90 },
              { user_id: 15, level: 43, exp: 72800 }
            ]
          },
          {
            id: 812,
            name: 'Backend Development',
            unlocked_users: ['{"user_id":15,"level":4,"experience":370}']
          }
        ]
      })
    };

    const progression = await getActorProgression(15, [
      '{"id":812,"name":"Backend development"}',
      '{"id":555,"name":"Customer Service"}'
    ], db);

    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('FROM skills'), [[812, 555]]);
    expect(progression).toEqual([
      { id: 555, name: 'Customer Service', level: 43, xp: 72800 },
      { id: 812, name: 'Backend Development', level: 4, xp: 370 }
    ]);
  });

  it('uses zero progression without inventing rewards when the actor has no unlock entry', async () => {
    const db = {
      query: vi.fn().mockResolvedValue({
        rows: [{ id: 555, name: 'Customer Service', unlocked_users: [] }]
      })
    };

    await expect(getActorProgression(15, [{ id: 555 }], db)).resolves.toEqual([
      { id: 555, name: 'Customer Service', level: 0, xp: 0 }
    ]);
  });
});
