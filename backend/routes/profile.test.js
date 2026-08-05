import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import pool from '../db.js';

vi.mock('../db.js', () => ({
  default: {
    query: vi.fn()
  }
}));

vi.mock('../utils/b2.js', () => ({
  uploadFile: vi.fn(),
  generatePrivateDownloadUrl: vi.fn(() => Promise.resolve('http://example.com/signed-url'))
}));

vi.mock('../services/interestService.js', () => ({
  processInterests: vi.fn()
}));

vi.mock('../services/skillService.js', () => ({
  processSkills: vi.fn()
}));

vi.mock('../services/RoleProfileEngine.js', () => ({
  default: {
    calculateRoleProfile: vi.fn(() => Promise.resolve({}))
  }
}));

vi.mock('../services/ProgressionEngine.js', () => ({
  default: {
    getUnlockedSystems: vi.fn(() => [])
  }
}));

vi.mock('../services/IdentityGateService.js', () => ({
  default: {
    calculateTier: vi.fn(() => 1)
  }
}));

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: class {
    constructor() {}
    getGenerativeModel() {
      return {
        generateContent: vi.fn()
      };
    }
  }
}));

const { default: profileRoutes } = await import('./profile.js');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/profile', profileRoutes);
  return app;
}

describe('public profile routes security boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /profile/public/:userId returns standard fields but strictly excludes resume_text', async () => {
    // Mock user database row
    const mockUserRow = {
      id: 123,
      username: 'sentinel_guardian',
      profile_picture: 'pic.jpg',
      skills: [],
      interests: [],
      badges: ['security_badge'],
      contact_links: [],
      capacity_status: 'available',
      discord_user_id: '123456789'
    };

    pool.query.mockImplementation((queryText, params) => {
      // Return mock user for the public profile query
      if (queryText.includes('SELECT') && queryText.includes('FROM users') && queryText.includes('WHERE id = $1')) {
        return Promise.resolve({ rows: [mockUserRow] });
      }
      // Return empty results for helper checks
      return Promise.resolve({ rows: [] });
    });

    const response = await request(buildApp())
      .get('/profile/public/123')
      .expect(200);

    // Verify response contains standard public identifiers
    expect(response.body.id).toBe(123);
    expect(response.body.username).toBe('sentinel_guardian');
    expect(response.body.discord_user_id).toBe('123456789');

    // Verify response strictly does NOT contain resume_text
    expect(response.body.resume_text).toBeUndefined();
    expect(response.body).not.toHaveProperty('resume_text');

    // Ensure the SQL query did not request resume_text column
    const publicProfileQuery = pool.query.mock.calls.find(call =>
      call[0].includes('SELECT') && call[0].includes('FROM users') && call[0].includes('WHERE id = $1')
    );
    expect(publicProfileQuery).toBeTruthy();
    expect(publicProfileQuery[0]).not.toContain('resume_text');
  });
});
