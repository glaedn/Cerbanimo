import { describe, it, expect, vi, beforeEach } from 'vitest';
import pool from '../../db.js';
import BaseAgent from './BaseAgent.js';

vi.mock('../../db.js', () => ({
  default: {
    query: vi.fn(),
  },
}));

vi.mock('../CivicEventService.js', () => ({
  default: {
    recordEvent: vi.fn(),
  },
}));

class TestAgent extends BaseAgent {
  constructor(scope) {
    super('TestAgent', scope);
  }
  async loadContext() {
    return { data: 'test', memory: this.instance?.memory || { count: 0 } };
  }
  async runReasoning(context) {
    return { actions: [{ type: 'increment' }] };
  }
  async executeActions(actions, context) {
    if (actions[0].type === 'increment') {
      context.memory.count++;
    }
  }
}

describe('BaseAgent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize instance and scope correctly', async () => {
    const agent = new TestAgent({ type: 'system', id: null });
    expect(agent.type).toBe('TestAgent');
    expect(agent.scope).toEqual({ type: 'system', id: null });
  });

  it('should ensure instance and persist memory', async () => {
    const agent = new TestAgent({ type: 'system', id: null });

    // Mock ensureInstance
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 'agent-123', memory: { count: 5 } }]
    });

    // Mock processCycle's final update
    pool.query.mockResolvedValueOnce({ rows: [] });

    await agent.processCycle();

    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO agent_instances'),
      ['TestAgent', 'system', null]
    );

    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE agent_instances SET last_run_at = NOW(), memory = $1 WHERE id = $2'),
      [JSON.stringify({ count: 6 }), 'agent-123']
    );
  });
});
