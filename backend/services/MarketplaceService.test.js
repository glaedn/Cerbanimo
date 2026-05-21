import { describe, it, expect, vi } from 'vitest';
import MarketplaceService from './MarketplaceService.js';
import pool from '../db.js';

vi.mock('../db.js', () => ({
  default: {
    query: vi.fn()
  }
}));

describe('MarketplaceService', () => {
  it('should fetch discovery items (all entries)', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Need' }] }) // needs
              .mockResolvedValueOnce({ rows: [{ id: 2, name: 'Resource' }] }) // resources
              .mockResolvedValueOnce({ rows: [] }); // projects

    const items = await MarketplaceService.getAllEntries({});
    expect(items.length).toBe(2);
    expect(items.some(i => i.name === 'Need')).toBe(true);
    expect(items.find(i => i.name === 'Need').entry_type).toBe('need');
  });

  it('should fetch entry by id', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Specific Need' }] });
    const item = await MarketplaceService.getEntryById('need', 1);
    expect(item.name).toBe('Specific Need');
  });
});
