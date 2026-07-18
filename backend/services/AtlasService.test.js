import { describe, expect, it, vi } from 'vitest';
import { getAtlasForUser } from './AtlasService.js';

describe('AtlasService', () => {
  it('returns only the resolved actor atlas with normalized project and community values', async () => {
    const database = {
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [{ id: 17, username: 'Wayfinder', city: 'Durham', state: 'NC' }] })
        .mockResolvedValueOnce({ rows: [{ id: 64, name: 'Reputation system', status: 'active', community_id: 9, community_name: 'Heartgrove', task_count: '18', completed_task_count: '4' }] })
        .mockResolvedValueOnce({ rows: [{ id: 9, name: 'Heartgrove', member_count: 12, city: 'Durham', state: 'NC' }] })
        .mockResolvedValueOnce({ rows: [{ id: 12, name: 'Lumenwood', member_count: 7, distance_km: 42.3, adjacency_reason: 'nearby' }] })
    };

    const atlas = await getAtlasForUser(17, database);

    expect(database.query).toHaveBeenCalledTimes(4);
    expect(atlas.actor).toMatchObject({ id: 17, username: 'Wayfinder' });
    expect(atlas.projects).toEqual([
      expect.objectContaining({ id: 64, communityId: 9, communityName: 'Heartgrove', taskCount: 18, completedTaskCount: 4 })
    ]);
    expect(atlas.communities.active[0]).toMatchObject({ id: 9, relationship: 'member', adjacencyReason: 'membership' });
    expect(atlas.communities.adjacent[0]).toMatchObject({ id: 12, relationship: 'adjacent', distanceKm: 42.3, adjacencyReason: 'nearby' });
  });

  it('returns null when the authenticated actor no longer exists', async () => {
    const database = {
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
    };

    await expect(getAtlasForUser(99, database)).resolves.toBeNull();
  });

  it('falls back to state and country adjacency when optional spatial columns are unavailable', async () => {
    const missingSpatialColumn = Object.assign(new Error('column actor.location_point does not exist'), { code: '42703' });
    const database = {
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [{ id: 17, username: 'Wayfinder', state: 'NC', country: 'US' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockRejectedValueOnce(missingSpatialColumn)
        .mockResolvedValueOnce({ rows: [{ id: 12, name: 'Lumenwood', member_count: 7, adjacency_reason: 'same_state' }] })
    };

    const atlas = await getAtlasForUser(17, database);

    expect(database.query).toHaveBeenCalledTimes(5);
    expect(atlas.communities.adjacent).toEqual([
      expect.objectContaining({ id: 12, relationship: 'adjacent', distanceKm: null, adjacencyReason: 'same_state' })
    ]);
  });
});
