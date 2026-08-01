import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

// Mock DB
vi.mock('../db.js', () => ({
  default: {
    query: vi.fn(),
    connect: vi.fn(),
  },
}));

// Mock B2 utils
vi.mock('../utils/b2.js', () => ({
  uploadFile: vi.fn(),
  generatePrivateDownloadUrl: vi.fn((path) => Promise.resolve(`https://signed-url.com/${path}`)),
}));

import pool from '../db.js';
import profileRoutes from './profile.js';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/profile', profileRoutes);
  return app;
}

describe('Profile Public Endpoint Security and Integrity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /profile/public/:userId successfully returns standard user identifiers but does NOT fetch or expose the sensitive PII field resume_text', async () => {
    const mockUser = {
      id: 123,
      username: 'test_guardian',
      profile_picture: 'avatar.png',
      skills: [{ name: 'Security Auditing', level: 5 }],
      interests: [{ name: 'Cryptographic Protocol Design' }],
      badges: ['First Sentinel'],
      contact_links: ['https://sentinel.security'],
      capacity_status: 'available',
      discord_user_id: 'discord_sentinel_999'
    };

    // First query: for user profile
    pool.query.mockResolvedValueOnce({
      rows: [mockUser],
    });
    // Second query: for active interests check
    pool.query.mockResolvedValueOnce({
      rows: [{ name: 'Cryptographic Protocol Design' }],
    });
    // Third query: for active skills check
    pool.query.mockResolvedValueOnce({
      rows: [{ name: 'Security Auditing' }],
    });

    const response = await request(buildApp())
      .get('/profile/public/123')
      .expect(200);

    // Verify it returns standard user identifiers
    expect(response.body.id).toBe(123);
    expect(response.body.username).toBe('test_guardian');
    expect(response.body.profile_picture).toContain('avatar.png');

    // Explicitly verify resume_text is completely absent from the response body
    expect(response.body.resume_text).toBeUndefined();

    // Verify the first query was made to the DB
    expect(pool.query).toHaveBeenCalled();
    const queryCall = pool.query.mock.calls[0];
    const sqlQuery = queryCall[0];
    const sqlParams = queryCall[1];

    expect(sqlParams).toEqual(['123']);
    // Verify that resume_text is NOT selected in the database query
    expect(sqlQuery.toLowerCase()).not.toContain('resume_text');
  });

  it('returns 404 if the user does not exist', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [],
    });

    const response = await request(buildApp())
      .get('/profile/public/999')
      .expect(404);

    expect(response.body.error).toBe('User not found');
  });
});
