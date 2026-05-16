import { describe, it, expect, vi } from 'vitest';
import SpatialQueryService from './SpatialQueryService.js';
import pool from '../db.js';

vi.mock('../db.js', () => ({
  default: {
    query: vi.fn()
  }
}));

describe('SpatialQueryService', () => {
  it('detectResourceDeserts should identify a desert when needs > 5 and resources < 2', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ need_count: 10 }] })
      .mockResolvedValueOnce({ rows: [{ resource_count: 1 }] });

    const result = await SpatialQueryService.detectResourceDeserts(40, -70, 1000);

    expect(result.isDesert).toBe(true);
    expect(result.needCount).toBe(10);
    expect(result.resourceCount).toBe(1);
  });

  it('detectResourceDeserts should not identify a desert when resources are sufficient', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ need_count: 10 }] })
      .mockResolvedValueOnce({ rows: [{ resource_count: 5 }] });

    const result = await SpatialQueryService.detectResourceDeserts(40, -70, 1000);

    expect(result.isDesert).toBe(false);
  });
});
