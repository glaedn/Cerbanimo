import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock dependencies of admin.js to avoid loading active services/DB calls
vi.mock('../db.js', () => ({
  default: {
    query: vi.fn().mockResolvedValue({ rows: [{ count: '10' }] }),
  },
}));

vi.mock('../controllers/taskController.js', () => ({
  default: {
    resetAllSpentPoints: vi.fn(),
  },
}));

vi.mock('../services/GuildService.js', () => ({
  default: {
    syncMembershipsWithSkills: vi.fn(),
  },
}));

vi.mock('../services/TaskRoutingService.js', () => ({
  default: {
    applyDynamicRewardAdjustment: vi.fn(),
    calculatePriorityScore: vi.fn(),
  },
}));

vi.mock('../services/ProjectHealthService.js', () => ({
  default: {
    calculateHealthScore: vi.fn(),
  },
}));

vi.mock('../services/GuildHealthService.js', () => ({
  default: {
    calculateGuildMetrics: vi.fn(),
  },
}));

vi.mock('../services/ConstellationHealthService.js', () => ({
  default: {
    calculateConstellationMetrics: vi.fn(),
  },
}));

vi.mock('../services/interestValidationService.js', () => ({
  validatePendingInterests: vi.fn(),
}));

vi.mock('../services/WeeklyWrapUpService.js', () => ({
  default: {
    generateWeeklyWrapUps: vi.fn(),
  },
}));

const { default: adminRoutes } = await import('./admin.js');

function buildApp(mockUser) {
  const app = express();
  app.use(express.json());

  // Inject mock user context representing the resolved user
  app.use((req, res, next) => {
    if (mockUser) {
      req.user = mockUser;
    }
    next();
  });

  app.use('/admin', adminRoutes);
  return app;
}

describe('Admin Authorization Middleware and Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('permits access to users who possess the "admin" role', async () => {
    const adminUser = { id: 42, username: 'superadmin', roles: ['user', 'admin'] };
    const app = buildApp(adminUser);

    const response = await request(app)
      .get('/admin/stats')
      .expect(200);

    expect(response.body).toHaveProperty('totalUsers');
    expect(response.body.totalUsers).toBe(10);
  });

  it('blocks access (404) for users without the "admin" role', async () => {
    const regularUser = { id: 7, username: 'regular_user', roles: ['user'] };
    const app = buildApp(regularUser);

    const response = await request(app)
      .get('/admin/stats')
      .expect(404);

    expect(response.body).toHaveProperty('message', 'Not Found');
  });

  it('blocks access (404) for user ID 15 if they do not have the "admin" role (Vulnerability Patch Verification)', async () => {
    // Specifically verify the hardcoded user ID 15 check is replaced by a secure check
    const vulnerableUser = { id: 15, username: 'clever_attacker', roles: ['user'] };
    const app = buildApp(vulnerableUser);

    const response = await request(app)
      .get('/admin/stats')
      .expect(404);

    expect(response.body).toHaveProperty('message', 'Not Found');
  });

  it('blocks access (404) for unauthenticated or unresolved users', async () => {
    const app = buildApp(null);

    const response = await request(app)
      .get('/admin/stats')
      .expect(404);

    expect(response.body).toHaveProperty('message', 'Not Found');
  });
});
