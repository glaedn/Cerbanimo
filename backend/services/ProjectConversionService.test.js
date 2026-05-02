import { describe, it, expect, vi, beforeEach } from 'vitest';
import pool from '../db.js';
import ProjectConversionService from './ProjectConversionService.js';
import { autoGenerateTasks } from './taskGenerator.js';
import ImpactGraphService from './ImpactGraphService.js';
import TaskRoutingService from './TaskRoutingService.js';
import { findMatchesForNeed } from './matchingService.js';

vi.mock('../db.js', () => {
  const mockClient = {
    query: vi.fn(),
    release: vi.fn(),
  };
  return {
    default: {
      connect: vi.fn(() => mockClient),
      query: vi.fn(),
    },
  };
});

vi.mock('./taskGenerator.js', () => ({
  autoGenerateTasks: vi.fn(),
}));

vi.mock('./ImpactGraphService.js', () => ({
  default: {
    createOutcome: vi.fn(),
    syncTaskNode: vi.fn(),
    linkTaskToOutcome: vi.fn(),
  },
}));

vi.mock('./TaskRoutingService.js', () => ({
  default: {
    calculatePriorityScore: vi.fn(),
  },
}));

vi.mock('./matchingService.js', () => ({
  findMatchesForNeed: vi.fn(),
}));

describe('ProjectConversionService', () => {
  let mockClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = pool.connect();
    findMatchesForNeed.mockResolvedValue({ users: [], resources: [] });
  });

  it('should convert a need to a project with tasks', async () => {
    const needId = 1;
    const mockNeed = {
      id: needId,
      name: 'Water Leak',
      description: 'Fixing a leak',
      requestor_user_id: 10,
      category: 'Maintenance',
      required_before_date: '2025-12-31'
    };

    mockClient.query.mockImplementation(async (sql, params) => {
      if (sql.includes('SELECT * FROM needs')) return { rows: [mockNeed] };
      if (sql.includes('INSERT INTO projects')) return { rows: [{ id: 500 }] };
      if (sql.includes('INSERT INTO tasks')) return { rows: [{ id: 1001 }] };
      return { rows: [], rowCount: 1 };
    });

    autoGenerateTasks.mockResolvedValue({
      tasks: [
        { id: 1, name: 'Inspect', description: 'desc', skill_name: 'Plumbing', impact_weight: 100 }
      ]
    });

    const project = await ProjectConversionService.convertNeedToProject(needId);

    expect(project.id).toBe(500);
    expect(mockClient.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO projects'), expect.any(Array));
    expect(mockClient.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE needs SET project_id'), [500, 'in_progress', needId]);
    expect(TaskRoutingService.calculatePriorityScore).toHaveBeenCalledWith(1001);
  });

  it('should use community admin if requestor_user_id is missing', async () => {
    const needId = 2;
    const mockNeed = {
      id: needId,
      name: 'Community Garden',
      description: 'Planting',
      requestor_community_id: 5,
      category: 'Nature'
    };

    mockClient.query.mockImplementation(async (sql, params) => {
      if (sql.includes('SELECT * FROM needs')) return { rows: [mockNeed] };
      if (sql.includes('roles) LIMIT 1')) return { rows: [{ id: 99 }] }; // admin check
      if (sql.includes('INSERT INTO projects')) return { rows: [{ id: 501 }] };
      return { rows: [{ id: 99 }], rowCount: 1 }; // generic success
    });

    autoGenerateTasks.mockResolvedValue({ tasks: [] });

    const project = await ProjectConversionService.convertNeedToProject(needId);
    expect(project.id).toBe(501);
  });

  it('should use system admin fallback if no community admin', async () => {
    const needId = 3;
    const mockNeed = {
      id: needId,
      name: 'Global Emergency',
      description: 'Emergency',
      category: 'Crisis'
    };

    mockClient.query.mockImplementation(async (sql, params) => {
      if (sql.includes('SELECT * FROM needs')) return { rows: [mockNeed] };
      if (sql.includes('roles) LIMIT 1')) return { rows: [] }; // no comm admin
      if (sql.includes("roles @> '{admin}'")) return { rows: [{ id: 1 }] }; // system admin
      if (sql.includes('INSERT INTO projects')) return { rows: [{ id: 502 }] };
      return { rows: [{ id: 1 }], rowCount: 1 };
    });

    autoGenerateTasks.mockResolvedValue({ tasks: [] });

    const project = await ProjectConversionService.convertNeedToProject(needId);
    expect(project.id).toBe(502);
  });

  it('should throw error if need not found', async () => {
    mockClient.query.mockImplementation(async (sql, params) => {
        if (sql.includes('SELECT * FROM needs')) return { rows: [] };
        return { rows: [], rowCount: 0 };
    });
    await expect(ProjectConversionService.convertNeedToProject(999)).rejects.toThrow('Need with ID 999 not found');
  });
});
