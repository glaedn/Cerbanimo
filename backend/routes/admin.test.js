import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import resolveUser from '../middlewares/resolveUser.js';
import adminRouter from './admin.js';

// Mock DB pool
const mockQuery = vi.fn();
vi.mock('../db.js', () => ({
  default: {
    query: (...args) => mockQuery(...args),
  },
}));

// Mock required services to prevent initialization failures
vi.mock('../controllers/taskController.js', () => ({ default: {} }));
vi.mock('../services/GuildService.js', () => ({ default: {} }));
vi.mock('../services/TaskRoutingService.js', () => ({ default: {} }));
vi.mock('../services/ProjectHealthService.js', () => ({ default: {} }));
vi.mock('../services/GuildHealthService.js', () => ({ default: {} }));
vi.mock('../services/ConstellationHealthService.js', () => ({ default: {} }));
vi.mock('../services/interestValidationService.js', () => ({ validatePendingInterests: vi.fn() }));
vi.mock('../services/WeeklyWrapUpService.js', () => ({ default: {} }));

describe('Admin security and authorization', () => {
  let app;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
  });

  describe('resolveUser middleware role population', () => {
    it('should query roles and attach them to req.user', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 42, username: 'test-admin', roles: ['admin', 'moderator'] }],
      });

      app.use((req, res, next) => {
        req.auth = { payload: { sub: 'auth0|123' } };
        next();
      }, resolveUser);

      app.get('/test-user-resolution', (req, res) => {
        res.json(req.user);
      });

      const res = await request(app).get('/test-user-resolution');
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT id, username, roles FROM users WHERE auth0_id = $1',
        ['auth0|123']
      );
      expect(res.body).toEqual({
        id: 42,
        username: 'test-admin',
        roles: ['admin', 'moderator'],
      });
    });

    it('should default to empty roles array if roles are null or missing', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 43, username: 'test-regular', roles: null }],
      });

      app.use((req, res, next) => {
        req.auth = { payload: { sub: 'auth0|regular' } };
        next();
      }, resolveUser);

      app.get('/test-user-resolution', (req, res) => {
        res.json(req.user);
      });

      const res = await request(app).get('/test-user-resolution');
      expect(res.body.roles).toEqual([]);
    });
  });

  describe('isAdmin middleware authorization check', () => {
    it('should allow access to admin routes if req.user has the admin role', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '10' }] }) // users
               .mockResolvedValueOnce({ rows: [{ count: '5' }] })  // projects
               .mockResolvedValueOnce({ rows: [{ count: '20' }] }) // tasks
               .mockResolvedValueOnce({ rows: [{ count: '15' }] }) // skills
               .mockResolvedValueOnce({ rows: [{ count: '8' }] });  // interests

      app.use((req, res, next) => {
        req.user = { id: 12, username: 'authorized-admin', roles: ['admin'] };
        next();
      });
      app.use('/admin', adminRouter);

      const res = await request(app)
        .get('/admin/stats')
        .expect(200);

      expect(res.body.totalUsers).toBe(10);
      expect(res.body.totalProjects).toBe(5);
    });

    it('should return 403 Forbidden if req.user does not have the admin role', async () => {
      app.use((req, res, next) => {
        req.user = { id: 15, username: 'imposter-user-15', roles: ['user'] };
        next();
      });
      app.use('/admin', adminRouter);

      const res = await request(app)
        .get('/admin/stats')
        .expect(403);

      expect(res.body.error).toBe('Forbidden');
    });

    it('should return 403 Forbidden if req.user is missing entirely', async () => {
      app.use('/admin', adminRouter);

      const res = await request(app)
        .get('/admin/stats')
        .expect(403);

      expect(res.body.error).toBe('Forbidden');
    });
  });
});
