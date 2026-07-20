import { describe, expect, it, vi } from 'vitest';
import GameMasterService, {
  hashInviteToken,
  normalizeNarrativePreferences,
  normalizePartyMessageContent
} from './GameMasterService.js';

describe('GameMasterService', () => {
  it('normalizes narrative preferences to the canonical enum contract', () => {
    const normalized = normalizeNarrativePreferences({
      presentationMode: 'game_master',
      narrativeIntensity: 'immersive',
      preferredGenres: ['synthwave', 'synthwave', 'cozy'],
      avoidThemes: ['horror'],
      statDisplayMode: 'both',
      seenIntro: true
    });

    expect(normalized).toEqual({
      presentationMode: 'game_master',
      narrativeIntensity: 'immersive',
      preferredGenres: ['synthwave', 'cozy'],
      avoidThemes: ['horror'],
      statDisplayMode: 'both',
      seenIntro: true,
      contentSafetyPreferences: {}
    });
  });

  it('hashes invite tokens without preserving the raw token', () => {
    const first = hashInviteToken('cerbanimo-secret-invite');
    const second = hashInviteToken('cerbanimo-secret-invite');

    expect(first).toBe(second);
    expect(first).toHaveLength(64);
    expect(first).not.toContain('cerbanimo-secret-invite');
  });

  it('normalizes party messages and rejects empty or oversized content', () => {
    expect(normalizePartyMessageContent('  Ready at the gate.  ')).toBe('Ready at the gate.');
    expect(() => normalizePartyMessageContent('   ')).toThrow('cannot be empty');
    expect(() => normalizePartyMessageContent('x'.repeat(2001))).toThrow('2,000 characters');
  });

  it('allows public project quest context visibility for authenticated actors', async () => {
    const policy = await GameMasterService.projectPolicy(
      { id: 1, creator_id: 2, visibility: 'public' },
      { actorUserId: 7, roles: [] },
      {
        query: vi.fn()
          .mockResolvedValueOnce({ rowCount: 0, rows: [] })
          .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      }
    );

    expect(policy.canView).toBe(true);
    expect(policy.canManage).toBe(false);
    expect(policy.canCreateInvite).toBe(false);
    expect(policy.canPostPartyMessage).toBe(false);
  });

  it('denies private project quest context to unrelated actors', async () => {
    const policy = await GameMasterService.projectPolicy(
      { id: 1, creator_id: 2, visibility: 'private' },
      { actorUserId: 7, roles: [] },
      {
        query: vi.fn()
          .mockResolvedValueOnce({ rowCount: 0, rows: [] })
          .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      }
    );

    expect(policy.canView).toBe(false);
    expect(policy.canManage).toBe(false);
  });

  it('lets the project creator manage party and narrative controls', async () => {
    const policy = await GameMasterService.projectPolicy(
      { id: 1, creator_id: 2, visibility: 'private' },
      { actorUserId: 2, roles: [] },
      {
        query: vi.fn()
          .mockResolvedValueOnce({ rowCount: 0, rows: [] })
          .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      }
    );

    expect(policy.canView).toBe(true);
    expect(policy.canCreateInvite).toBe(true);
    expect(policy.canUpdateQuestProfile).toBe(true);
    expect(policy.canLaunchQuest).toBe(true);
    expect(policy.canPostPartyMessage).toBe(true);
  });

  it('lets an invited party member use party communication without granting project management', async () => {
    const policy = await GameMasterService.projectPolicy(
      { id: 1, creator_id: 2, visibility: 'private' },
      { actorUserId: 7, roles: [] },
      {
        query: vi.fn()
          .mockResolvedValueOnce({ rowCount: 0, rows: [] })
          .mockResolvedValueOnce({ rowCount: 1, rows: [{ user_id: 7 }] })
      }
    );

    expect(policy.canView).toBe(true);
    expect(policy.canManage).toBe(false);
    expect(policy.canPostPartyMessage).toBe(true);
  });
});
