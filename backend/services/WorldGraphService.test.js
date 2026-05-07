import { describe, it, expect, vi, beforeEach } from 'vitest';
import WorldGraphService from './WorldGraphService.js';
import pool from '../db.js';

vi.mock('../db.js', () => ({
  default: {
    query: vi.fn(),
    connect: vi.fn(() => ({
      query: vi.fn(),
      release: vi.fn(),
    })),
  },
}));

describe('WorldGraphService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    WorldGraphService.initialized = true; // Skip initialization for unit tests
  });

  describe('upsertNode', () => {
    it('should call executeCypher with correct MERGE query', async () => {
      const node = {
        nodeType: 'person',
        entityType: 'user',
        entityId: 1,
        label: 'Test User'
      };

      pool.query.mockResolvedValueOnce({ rows: [{ result: { id: 1 } }] });

      await WorldGraphService.upsertNode(node);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM ag_catalog.cypher'),
        expect.anything()
      );

      const lastCallArgs = pool.query.mock.calls[0];
      const cypherCall = lastCallArgs[0];
      const params = JSON.parse(lastCallArgs[1][1]);

      expect(cypherCall).toContain('MERGE (n:person');
      expect(params.entityId).toBe(1);
      expect(params.label).toBe('Test User');
    });
  });

  describe('linkEntities', () => {
    it('should upsert nodes and link them', async () => {
      const from = { nodeType: 'person', entityType: 'user', entityId: 1, label: 'User 1' };
      const to = { nodeType: 'task', entityType: 'task', entityId: 10, label: 'Task 10' };

      pool.query.mockResolvedValue({ rows: [{ result: { id: 123 } }] });

      await WorldGraphService.linkEntities(from, to, 'CONTRIBUTES_TO');

      // 1 upsert for 'from', 1 for 'to', 1 for 'link'
      expect(pool.query).toHaveBeenCalledTimes(3);
    });
  });

  describe('Cognition Queries', () => {
    it('findTrustedVolunteersNear should use correct Cypher', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });
      await WorldGraphService.findTrustedVolunteersNear('New York');

      const lastCallArgs = pool.query.mock.calls[0];
      expect(lastCallArgs[0]).toContain('MATCH (p:person)-[:TRUSTS*1..2]-(peer:person)');
      expect(lastCallArgs[1][1]).toContain('New York');
    });

    it('findAdjacentNeeds should use correct Cypher', async () => {
        pool.query.mockResolvedValueOnce({ rows: [] });
        await WorldGraphService.findAdjacentNeeds(5);

        const lastCallArgs = pool.query.mock.calls[0];
        expect(lastCallArgs[0]).toContain('MATCH (n:need { entityId: $needId })');
        expect(lastCallArgs[1][1]).toContain('"needId":5');
      });
  });
});
