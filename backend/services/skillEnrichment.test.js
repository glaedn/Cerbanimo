import { describe, it, expect, vi, beforeEach } from 'vitest';
import GuildService from '../services/GuildService.js';
import pool from '../db.js';

vi.mock('../db.js', () => ({
  default: {
    query: vi.fn(),
  },
}));

const mockGenerateContent = vi.fn();

vi.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: vi.fn().mockImplementation(function() {
      return {
        getGenerativeModel: vi.fn().mockImplementation(() => ({
          generateContent: mockGenerateContent,
        })),
      };
    }),
  };
});

vi.mock('./taskGenerator.js', () => ({
  parseLLMJsonResponse: vi.fn((text) => JSON.parse(text)),
}));

describe('GuildService.enrichSkillsAndHierarchy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should process skills in batches and apply correct logic including status and validation', async () => {
    const noParentSkills = [
      { id: 1, name: 'Skill 1' },
    ];
    const noDescSkills = [
      { id: 3, name: 'Skill 3', parent_skill_id: 10 },
    ];
    const pendingSkills = [
      { id: 2, name: 'Skill 2' },
    ];

    pool.query.mockImplementation(async (query, params) => {
      if (query.includes('parent_skill_id IS NULL AND status = \'active\'')) {
        return { rows: noParentSkills };
      }
      if (query.includes('description IS NULL OR description = \'\'')) {
        return { rows: noDescSkills };
      }
      if (query.includes('status = \'pending\'')) {
        return { rows: pendingSkills };
      }
      if (query.includes('SELECT DISTINCT p.id, p.name')) {
        return { rows: [{ id: 10, name: 'Parent 10' }] };
      }
      if (query.includes('SELECT id FROM skills WHERE name = $1')) {
          if (params[0] === 'New Parent') return { rows: [] };
          return { rows: [] };
      }
      if (query.includes('INSERT INTO skills')) {
          return { rows: [{ id: 11 }] };
      }
      if (query.includes('SELECT name, description FROM skills WHERE id = $1')) {
        return { rows: [{ name: 'Test Skill', description: 'Test Desc' }] };
      }
      return { rows: [] };
    });

    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => JSON.stringify([
          { skill_id: 1, status: 'active', parent_skill_id: 10, suggested_parent_name: null, description: 'Desc 1' },
          { skill_id: 2, status: 'active', parent_skill_id: null, suggested_parent_name: 'New Parent', description: 'Desc 2' },
          { skill_id: 3, status: 'active', parent_skill_id: 10, suggested_parent_name: null, description: 'Desc 3' },
        ]),
      },
    });

    await GuildService.enrichSkillsAndHierarchy();

    expect(mockGenerateContent).toHaveBeenCalledTimes(1);

    // Check if updates were called
    // Skill 1: should have status active, desc and parent 10
    expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE skills SET status = $2, description = $3, parent_skill_id = $4 WHERE id = $1'),
        [1, 'active', 'Desc 1', 10]
    );
    // Skill 2: should have status active, desc and parent 11 (newly created)
    expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE skills SET status = $2, description = $3, parent_skill_id = $4 WHERE id = $1'),
        [2, 'active', 'Desc 2', 11]
    );
    // Skill 3: should have status active and desc updated
    expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE skills SET status = $2, description = $3 WHERE id = $1'),
        [3, 'active', 'Desc 3']
    );
  });
});
