import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock pool from ../db.js
const mockQuery = vi.fn();
vi.mock('../db.js', () => ({
  default: {
    query: (...args) => mockQuery(...args),
    connect: vi.fn(),
  },
}));

// Mock b2.js utilities
vi.mock('../utils/b2.js', () => ({
  uploadFile: vi.fn(),
  generatePrivateDownloadUrl: vi.fn().mockResolvedValue('http://signed-url.com/pic.jpg'),
}));

// Mock other services as needed
vi.mock('../services/interestService.js', () => ({
  processInterests: vi.fn(),
}));

vi.mock('../services/skillService.js', () => ({
  processSkills: vi.fn(),
}));

vi.mock('../services/GeocodingService.js', () => ({
  default: {
    search: vi.fn(),
  },
}));

vi.mock('../services/RoleProfileEngine.js', () => ({
  default: {
    calculateRoleProfile: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('../services/ProgressionEngine.js', () => ({
  default: {
    getUnlockedSystems: vi.fn().mockReturnValue([]),
  },
}));

vi.mock('../services/IdentityGateService.js', () => ({
  default: {
    calculateTier: vi.fn().mockReturnValue(1),
  },
}));

vi.mock('../services/PotentialUserService.js', () => ({
  default: {
    migrateToUser: vi.fn(),
  },
}));

// Import the profile router
const { default: profileRoutes } = await import('./profile.js');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/profile', profileRoutes);
  return app;
}

describe('Profile Route - Public Access Security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /profile/public/:userId successfully fetches public user data and explicitly excludes resume_text', async () => {
    // Mock the user query result from DB
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 42,
          username: 'security_sentinel',
          profile_picture: 'pic_42.jpg',
          skills: [],
          interests: [],
          badges: [],
          contact_links: [],
          capacity_status: 'active',
          discord_user_id: '123456789',
          // Note: resume_text is intentionally NOT here, because we expect the query not to select it
        },
      ],
    });

    const response = await request(buildApp())
      .get('/profile/public/42')
      .expect(200);

    // Verify DB query didn't contain resume_text field in SELECT list
    expect(mockQuery).toHaveBeenCalled();
    const calledQuery = mockQuery.mock.calls[0][0];
    expect(calledQuery).toContain('SELECT id, username, profile_picture, skills, interests, badges, contact_links, capacity_status, discord_user_id');
    expect(calledQuery).not.toContain('resume_text');

    // Verify the response payload
    expect(response.body).toBeDefined();
    expect(response.body.id).toBe(42);
    expect(response.body.username).toBe('security_sentinel');
    expect(response.body.profile_picture).toBe('http://signed-url.com/pic.jpg');

    // Explicitly assert that resume_text is NOT present in the public endpoint response
    expect(response.body.resume_text).toBeUndefined();
  });

  it('GET /profile/public/:userId returns 404 if user not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const response = await request(buildApp())
      .get('/profile/public/999')
      .expect(404);

    expect(response.body.error).toBe('User not found');
  });
});
