import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

// Mock services to prevent loading them or because profile.js imports them
vi.mock('../utils/b2.js', () => ({
  generatePrivateDownloadUrl: vi.fn((val) => Promise.resolve(`http://b2.com/${val}`))
}));

vi.mock('../services/interestService.js', () => ({
  processInterests: vi.fn()
}));

vi.mock('../services/skillService.js', () => ({
  processSkills: vi.fn()
}));

vi.mock('../services/GeocodingService.js', () => ({
  search: vi.fn()
}));

vi.mock('../services/RoleProfileEngine.js', () => ({
  calculateRoleProfile: vi.fn()
}));

vi.mock('../services/ProgressionEngine.js', () => ({
  getUnlockedSystems: vi.fn()
}));

vi.mock('../services/IdentityGateService.js', () => ({
  calculateTier: vi.fn()
}));

vi.mock('../services/PotentialUserService.js', () => ({
  migrateToUser: vi.fn()
}));

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: class {
    constructor() {}
    getGenerativeModel() {
      return {};
    }
  }
}));

// Mock pg pool
vi.mock('../db.js', () => {
  const mockQuery = vi.fn();
  return {
    default: {
      query: mockQuery,
      connect: vi.fn(() => ({
        query: mockQuery,
        release: vi.fn()
      }))
    }
  };
});

import pool from '../db.js';
import profileRoutes from './profile.js';

const app = express();
app.use(express.json());
app.use('/profile', profileRoutes);

describe('GET /profile/public/:userId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch public profile and explicitly omit resume_text', async () => {
    // Mock the database query response to simulate a user profile
    pool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 42,
          username: 'cyber_sentinel',
          profile_picture: 'avatar.png',
          skills: [],
          interests: [],
          badges: [],
          contact_links: [],
          capacity_status: 'available',
          discord_user_id: 'discord-id-123'
        }
      ]
    });

    const response = await request(app)
      .get('/profile/public/42')
      .expect(200);

    // Verify response properties
    expect(response.body).toHaveProperty('id', 42);
    expect(response.body).toHaveProperty('username', 'cyber_sentinel');
    expect(response.body).toHaveProperty('profile_picture', 'http://b2.com/avatar.png');
    expect(response.body).not.toHaveProperty('resume_text');

    // Verify database query arguments
    expect(pool.query).toHaveBeenCalledTimes(1);
    const queryCall = pool.query.mock.calls[0];
    const sqlQuery = queryCall[0];
    const queryParams = queryCall[1];

    expect(queryParams).toEqual(['42']);
    // Ensure resume_text is NOT selected in the SQL query
    expect(sqlQuery).not.toContain('resume_text');
    expect(sqlQuery).toContain('id, username, profile_picture');
  });

  it('should return 404 if the user is not found', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    await request(app)
      .get('/profile/public/999')
      .expect(404);
  });
});
