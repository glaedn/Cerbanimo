import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import pool from '../db.js';
import profileRouter from './profile.js';

// Mock DB module
vi.mock('../db.js', () => ({
  default: {
    query: vi.fn(),
    connect: vi.fn(),
  },
}));

// Mock other external dependencies as necessary
vi.mock('../utils/b2.js', () => ({
  uploadFile: vi.fn().mockResolvedValue({}),
  generatePrivateDownloadUrl: vi.fn().mockResolvedValue('http://mockurl.com/private'),
}));

vi.mock('../services/interestService.js', () => ({
  processInterests: vi.fn().mockResolvedValue([]),
}));

vi.mock('../services/skillService.js', () => ({
  processSkills: vi.fn().mockResolvedValue([]),
}));

describe('Public Profile Route Security', () => {
  let app;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/profile', profileRouter);
  });

  describe('GET /profile/public/:userId', () => {
    it('returns public profile data but does NOT include resume_text', async () => {
      // Mock db response returning resume_text
      pool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            username: 'testuser',
            profile_picture: 'pic.png',
            skills: [],
            interests: [],
            badges: [],
            contact_links: [],
            capacity_status: 'available',
            discord_user_id: '1234567890',
            // Even if the DB returned it because we omitted it in select, let's make sure it's absent or not selected
          },
        ],
      });

      const response = await request(app).get('/profile/public/1');

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
      expect(response.body.username).toBe('testuser');
      expect(response.body.resume_text).toBeUndefined(); // Crucial security assertion!

      // Verify DB query doesn't select resume_text
      const lastQuery = pool.query.mock.calls[0][0];
      expect(lastQuery).not.toContain('resume_text');
    });

    it('returns 404 if user is not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app).get('/profile/public/999');
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('User not found');
    });
  });
});
