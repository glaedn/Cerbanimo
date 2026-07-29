import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock pool from ../db.js
vi.mock('../db.js', () => ({
  default: {
    query: vi.fn()
  }
}));

// Mock other dependencies to prevent errors during import or execution
vi.mock('../utils/b2.js', () => ({
  uploadFile: vi.fn(),
  generatePrivateDownloadUrl: vi.fn((path) => Promise.resolve(`https://mock-b2.com/${path}`))
}));

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

// Now import the router
import pool from '../db.js';
import profileRouter from './profile.js';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/profile', profileRouter);
  return app;
}

describe('Profile Public Route Security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /profile/public/:userId should return profile details but must NOT expose resume_text (PII)', async () => {
    // Mock database response for the user
    const mockUser = {
      id: 123,
      username: 'security_sentinel',
      profile_picture: 'avatar.png',
      skills: [{ id: 1, name: 'Cybersecurity' }],
      interests: [{ id: 2, name: 'Privacy' }],
      badges: [],
      contact_links: [],
      capacity_status: 'available',
      discord_user_id: '1234567890'
    };

    pool.query.mockImplementation((queryText, params) => {
      // First query is the user fetch
      if (queryText.includes('SELECT id, username, profile_picture')) {
        // Double check query doesn't contain resume_text
        expect(queryText).not.toContain('resume_text');
        return Promise.resolve({ rows: [mockUser] });
      }
      // Subsequent queries for interests/skills
      if (queryText.includes('SELECT name FROM interests')) {
        return Promise.resolve({ rows: [{ name: 'Privacy' }] });
      }
      if (queryText.includes('SELECT name FROM skills')) {
        return Promise.resolve({ rows: [{ name: 'Cybersecurity' }] });
      }
      return Promise.resolve({ rows: [] });
    });

    const response = await request(buildApp())
      .get('/profile/public/123')
      .expect(200);

    // Verify response contains standard user identifiers and public fields
    expect(response.body.id).toBe(123);
    expect(response.body.username).toBe('security_sentinel');
    expect(response.body.profile_picture).toContain('https://mock-b2.com/avatar.png');

    // Crucial: assert that resume_text is completely absent from the public payload
    expect(response.body.resume_text).toBeUndefined();
    expect(response.body).not.toHaveProperty('resume_text');
  });

  it('GET /profile/public/:userId should handle user not found safely', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const response = await request(buildApp())
      .get('/profile/public/999')
      .expect(404);

    expect(response.body.error).toBe('User not found');
  });
});
