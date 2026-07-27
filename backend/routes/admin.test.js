import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock the db module
vi.mock('../db.js', () => ({
  default: {
    query: vi.fn(),
    connect: vi.fn()
  }
}));

import pool from '../db.js';
import resolveUser from '../middlewares/resolveUser.js';
import adminRoutes from './admin.js';

describe('Admin Router & Role-Based Access Control', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('resolveUser Middleware', () => {
    it('should call next() without setting req.user if no auth is present', async () => {
      const req = {};
      const res = {};
      const next = vi.fn();

      await resolveUser(req, res, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });

    it('should fetch and attach user from pool with roles defaulted to empty array', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ id: 10, username: 'tester', roles: null }]
      });

      const req = {
        auth: {
          payload: {
            sub: 'auth0|testuser'
          }
        }
      };
      const res = {};
      const next = vi.fn();

      await resolveUser(req, res, next);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, username, roles FROM users'),
        ['auth0|testuser']
      );
      expect(req.user).toBeDefined();
      expect(req.user.id).toBe(10);
      expect(req.user.username).toBe('tester');
      expect(req.user.roles).toEqual([]);
      expect(next).toHaveBeenCalled();
    });

    it('should attach user roles correctly if they are present as an array', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ id: 10, username: 'tester', roles: ['admin', 'user'] }]
      });

      const req = {
        auth: {
          payload: {
            sub: 'auth0|testuser'
          }
        }
      };
      const res = {};
      const next = vi.fn();

      await resolveUser(req, res, next);

      expect(req.user.roles).toEqual(['admin', 'user']);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('isAdmin Middleware and Admin Endpoints', () => {
    function buildApp(mockUser) {
      const app = express();
      app.use(express.json());
      app.use((req, res, next) => {
        if (mockUser) {
          req.user = mockUser;
        }
        next();
      });
      app.use('/admin', adminRoutes);
      return app;
    }

    it('should deny access (403) to endpoints for unauthenticated requests', async () => {
      const app = buildApp(null);
      const res = await request(app).get('/admin/stats');

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Access Denied');
    });

    it('should deny access (403) to endpoints for non-admin users', async () => {
      const app = buildApp({ id: 12, username: 'normal_user', roles: ['user'] });
      const res = await request(app).get('/admin/stats');

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Access Denied');
    });

    it('should allow access (200) to admin stats for admin users', async () => {
      // Mock db queries within the admin endpoint /stats
      pool.query.mockResolvedValue({
        rows: [{ count: '5' }]
      });

      const app = buildApp({ id: 15, username: 'admin_user', roles: ['admin'] });
      const res = await request(app).get('/admin/stats');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        totalUsers: 5,
        totalProjects: 5,
        totalTasks: 5,
        totalSkills: 5,
        totalInterests: 5
      });
    });
  });
});
