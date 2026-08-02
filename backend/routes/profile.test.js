import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock DB pool
const mockQuery = vi.fn();
vi.mock('../db.js', () => ({
  default: {
    query: (...args) => mockQuery(...args),
  }
}));

// Mock utils/b2.js
vi.mock('../utils/b2.js', () => ({
  uploadFile: vi.fn(),
  generatePrivateDownloadUrl: vi.fn().mockResolvedValue('http://signed-url.com/pic.jpg')
}));

// Mock other dependencies
vi.mock('../services/interestService.js', () => ({
  processInterests: vi.fn()
}));
vi.mock('../services/skillService.js', () => ({
  processSkills: vi.fn()
}));
vi.mock('../services/GeocodingService.js', () => ({
  default: {
    search: vi.fn()
  }
}));
vi.mock('../services/RoleProfileEngine.js', () => ({
  default: {
    calculateRoleProfile: vi.fn()
  }
}));
vi.mock('../services/ProgressionEngine.js', () => ({
  default: {
    getUnlockedSystems: vi.fn()
  }
}));
vi.mock('../services/IdentityGateService.js', () => ({
  default: {
    calculateTier: vi.fn()
  }
}));
vi.mock('../services/PotentialUserService.js', () => ({
  default: {
    migrateToUser: vi.fn()
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

// Dynamically import the router after mocking
const { default: profileRoutes } = await import('./profile.js');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/profile', profileRoutes);
  return app;
}

describe('profile public routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /profile/public/:userId', () => {
    it('successfully returns standard user profile information but does not fetch or expose the sensitive resume_text field', async () => {
      // Setup DB mock returns
      mockQuery.mockImplementation((queryStr, values) => {
        if (queryStr.includes('SELECT id, username, profile_picture')) {
          // Verify that resume_text is NOT selected
          expect(queryStr).not.toContain('resume_text');

          return Promise.resolve({
            rows: [{
              id: 42,
              username: 'guardian_sentinel',
              profile_picture: 'avatar.png',
              skills: [],
              interests: [],
              badges: ['security-champion'],
              contact_links: ['https://github.com/sentinel'],
              capacity_status: 'available',
              discord_user_id: '123456789'
            }]
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(buildApp())
        .get('/profile/public/42')
        .expect(200);

      // Verify returned user fields
      expect(response.body.id).toBe(42);
      expect(response.body.username).toBe('guardian_sentinel');
      expect(response.body.profile_picture).toBe('http://signed-url.com/pic.jpg');
      expect(response.body.badges).toContain('security-champion');
      expect(response.body.contact_links).toContain('https://github.com/sentinel');
      expect(response.body.capacity_status).toBe('available');
      expect(response.body.discord_user_id).toBe('123456789');

      // Crucially, verify that resume_text is NOT present
      expect(response.body).not.toHaveProperty('resume_text');
      expect(response.body.resume_text).toBeUndefined();
    });

    it('returns 404 if the user does not exist', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const response = await request(buildApp())
        .get('/profile/public/999')
        .expect(404);

      expect(response.body.error).toBe('User not found');
    });
  });
});
