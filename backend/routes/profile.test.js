import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

// Mock services
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

// Mock database connection (db.js) using the vi.hoisted API so it is initialized before anything else
const { mockQuery } = vi.hoisted(() => {
  return {
    mockQuery: vi.fn(),
  };
});

vi.mock('../db.js', () => {
  return {
    default: {
      query: mockQuery,
    }
  };
});

// Mock multer
vi.mock('multer', () => {
  const multer = () => ({
    single: () => (req, res, next) => {
      req.file = { path: 'uploads/test.jpg' };
      next();
    },
  });
  multer.diskStorage = vi.fn();
  return { default: multer };
});

import profileRoutes from './profile.js';

const app = express();
app.use(express.json());
app.use('/api/profile', profileRoutes);

describe('GET /api/profile/public/:userId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return public profile without exposing resume_text', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 123,
          username: 'security_sentinel',
          profile_picture: 'avatar.png',
          skills: [],
          interests: [],
          badges: [],
          contact_links: [],
          capacity_status: 'available',
          discord_user_id: 'discord123',
        }
      ]
    });

    const response = await request(app)
      .get('/api/profile/public/123')
      .expect(200);

    // Verify expected public fields
    expect(response.body.id).toBe(123);
    expect(response.body.username).toBe('security_sentinel');
    expect(response.body.discord_user_id).toBe('discord123');

    // EXPLICITLY verify resume_text is NOT present
    expect(response.body.resume_text).toBeUndefined();

    // Verify query itself did not select resume_text
    expect(mockQuery).toHaveBeenCalled();
    const queryArg = mockQuery.mock.calls[0][0];
    expect(queryArg).not.toContain('resume_text');
  });

  it('should return 404 if user is not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await request(app)
      .get('/api/profile/public/999')
      .expect(404);
  });
});
