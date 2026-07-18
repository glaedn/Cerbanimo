import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock the pool database connection
vi.mock('../db.js', () => ({
  default: {
    query: vi.fn(),
    connect: vi.fn(),
  }
}));

// Mock external services to prevent side effects
vi.mock('../utils/b2.js', () => ({
  uploadFile: vi.fn(),
  generatePrivateDownloadUrl: vi.fn().mockResolvedValue('http://mocked-signed-url.com/avatar.png'),
}));

vi.mock('../services/interestService.js', () => ({
  processInterests: vi.fn(),
}));

vi.mock('../services/skillService.js', () => ({
  processSkills: vi.fn(),
}));

vi.mock('../services/GeocodingService.js', () => ({
  default: {
    search: vi.fn(),
  }
}));

vi.mock('../services/RoleProfileEngine.js', () => ({
  default: {
    calculateRoleProfile: vi.fn().mockResolvedValue({}),
  }
}));

vi.mock('../services/ProgressionEngine.js', () => ({
  default: {
    getUnlockedSystems: vi.fn().mockReturnValue([]),
  }
}));

vi.mock('../services/IdentityGateService.js', () => ({
  default: {
    calculateTier: vi.fn().mockReturnValue(1),
  }
}));

vi.mock('../services/PotentialUserService.js', () => ({
  default: {
    migrateToUser: vi.fn(),
  }
}));

// Import routing and db pool
import pool from '../db.js';
import profileRoutes from './profile.js';

const app = express();
app.use(express.json());
app.use('/profile', profileRoutes);

describe('GET /profile/public/:userId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('successfully returns public profile details but strictly excludes resume_text', async () => {
    const mockUser = {
      id: 123,
      username: 'john_doe',
      profile_picture: 'avatar.png',
      skills: [],
      interests: [],
      badges: [],
      contact_links: ['https://github.com'],
      capacity_status: 'available',
      discord_user_id: 'discord123',
    };

    // Mock query logic for the users table fetch
    pool.query.mockImplementation((sql, params) => {
      if (sql.includes('FROM users')) {
        return Promise.resolve({ rows: [mockUser] });
      }
      return Promise.resolve({ rows: [] });
    });

    const response = await request(app)
      .get('/profile/public/123')
      .expect(200);

    expect(response.body).toBeDefined();
    expect(response.body.id).toBe(123);
    expect(response.body.username).toBe('john_doe');

    // Core security assertion: ensure resume_text is completely absent
    expect(response.body).not.toHaveProperty('resume_text');
    expect(response.body.resume_text).toBeUndefined();
  });
});
