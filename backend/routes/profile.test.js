import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock database pool
vi.mock('../db.js', () => ({
  default: {
    query: vi.fn(),
    connect: vi.fn()
  }
}));

// Mock B2 signed download utility
vi.mock('../utils/b2.js', () => ({
  generatePrivateDownloadUrl: vi.fn((filename) => Promise.resolve(`https://signed-url-for-${filename}`))
}));

// Import routing after setting up mocks to avoid unmocked calls
import pool from '../db.js';
import profileRoutes from './profile.js';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/profile', profileRoutes);
  return app;
}

describe('Profile Route - GET /profile/public/:userId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should retrieve public profile data and explicitly exclude resume_text (Security Precaution)', async () => {
    // Mock the user public profile query result
    pool.query.mockImplementation((queryText, params) => {
      if (queryText.includes('SELECT id, username, profile_picture')) {
        return Promise.resolve({
          rows: [{
            id: 42,
            username: 'JohnDoe',
            profile_picture: 'avatar.png',
            skills: [],
            interests: [],
            badges: [],
            contact_links: [],
            capacity_status: 'available',
            discord_user_id: 'discord123'
          }]
        });
      }
      return Promise.resolve({ rows: [] });
    });

    const response = await request(buildApp())
      .get('/profile/public/42')
      .expect(200);

    // Assert that standard public fields are retrieved successfully
    expect(response.body).toBeDefined();
    expect(response.body.id).toBe(42);
    expect(response.body.username).toBe('JohnDoe');
    expect(response.body.profile_picture).toBe('https://signed-url-for-avatar.png');

    // Assert that the sensitive PII field resume_text is completely absent from the response
    expect(response.body.resume_text).toBeUndefined();
  });

  it('should return 404 when user does not exist', async () => {
    pool.query.mockImplementation(() => Promise.resolve({ rows: [] }));

    const response = await request(buildApp())
      .get('/profile/public/999')
      .expect(404);

    expect(response.body.error).toBe('User not found');
  });
});
