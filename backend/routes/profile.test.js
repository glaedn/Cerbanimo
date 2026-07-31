import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock the db first
vi.mock('../db.js', () => ({
  default: {
    query: vi.fn(),
  }
}));

// Mock utils/b2
vi.mock('../utils/b2.js', () => ({
  uploadFile: vi.fn(),
  generatePrivateDownloadUrl: vi.fn((filename) => Promise.resolve(`https://signed-b2-url.com/${filename}`)),
}));

// Mock other services imported by profile.js
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
    calculateRoleProfile: vi.fn(),
  }
}));
vi.mock('../services/ProgressionEngine.js', () => ({
  default: {
    getUnlockedSystems: vi.fn(),
  }
}));
vi.mock('../services/IdentityGateService.js', () => ({
  default: {
    calculateTier: vi.fn(),
  }
}));
vi.mock('../services/PotentialUserService.js', () => ({
  default: {
    migrateToUser: vi.fn(),
  }
}));

// Mock google generative-ai with a standard ES6 class constructor to avoid Vitest hoisting and vi.fn() constructor errors
vi.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: class {
      constructor() {}
      getGenerativeModel() {
        return {
          generateContent: async () => ({
            response: {
              text: () => "[]"
            }
          })
        };
      }
    }
  };
});

// Now import pool and the profile router
import pool from '../db.js';
import profileRouter from './profile.js';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/profile', profileRouter);
  return app;
}

describe('profile routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /profile/public/:userId', () => {
    it('returns public profile fields but does NOT include resume_text', async () => {
      // Mock the DB query response.
      // Notice resume_text is NOT selected in the database query result.
      pool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 42,
            username: 'alice_unauthenticated',
            profile_picture: 'avatar.png',
            skills: null,
            interests: null,
            badges: [],
            contact_links: [],
            capacity_status: 'active',
            discord_user_id: 'discord123',
            // No resume_text returned from DB because it's not in the SELECT list
          }
        ],
        rowCount: 1,
      });

      const response = await request(buildApp())
        .get('/profile/public/42')
        .expect(200);

      // Verify returned fields are correct
      expect(response.body.id).toBe(42);
      expect(response.body.username).toBe('alice_unauthenticated');
      expect(response.body.profile_picture).toContain('https://signed-b2-url.com/avatar.png');
      expect(response.body.capacity_status).toBe('active');
      expect(response.body.discord_user_id).toBe('discord123');

      // Crucial: verify resume_text is completely absent
      expect(response.body.resume_text).toBeUndefined();
      expect(response.body).not.toHaveProperty('resume_text');
    });

    it('returns 404 if user does not exist', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      const response = await request(buildApp())
        .get('/profile/public/999')
        .expect(404);

      expect(response.body.error).toBe('User not found');
    });
  });
});
