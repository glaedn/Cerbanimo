import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('../services/apiAuthService.js', () => {
  const API_SCOPES = {
    AI_ROUTE: 'ai:route',
    CAPABILITIES_READ: 'capabilities:read',
    ACTIONS_READ: 'actions:read',
    ACTIONS_WRITE: 'actions:write',
    AUTOMATION_READ: 'automation:read',
    AUTOMATION_WRITE: 'automation:write',
    READ_STATS: 'stats:read',
    SEARCH: 'search:read',
    MEMORY_WRITE: 'memory:write',
    RENDER_READ: 'render:read'
  };
  return {
    API_SCOPES,
    apiAuthenticate: (req, res, next) => {
      req.user = { id: 1, username: 'test-user', email: 'test@example.com', roles: ['user'] };
      req.apiAuth = { type: 'auth0', scopes: Object.values(API_SCOPES), clientName: 'kamiya-test' };
      next();
    },
    allScopesForUser: () => Object.values(API_SCOPES),
    requireScopes: () => (req, res, next) => next()
  };
});

vi.mock('../db.js', () => ({
  default: {
    query: vi.fn(),
    connect: vi.fn()
  }
}));

const { default: platformRoutes } = await import('./platform.js');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(platformRoutes);
  return app;
}

describe('platform routes', () => {
  it('routes intent requests through the normalized envelope', async () => {
    const response = await request(buildApp())
      .post('/ai/intent-route')
      .send({ message: 'create a project plan' })
      .expect(200);

    expect(response.body.ok).toBe(true);
    expect(response.body.data.intent).toBe('project');
    expect(response.body.data.suggestedFunctions).toContain('projects.create');
  });

  it('returns planning missing fields and next questions', async () => {
    const response = await request(buildApp())
      .post('/ai/planning/analyze')
      .send({ idea: 'make a task', intent: 'task', draft: { name: 'Draft task' } })
      .expect(200);

    expect(response.body.data.readyToCreate).toBe(false);
    expect(response.body.data.missingFields).toContain('projectId');
    expect(response.body.data.recommendedNextQuestions.length).toBeGreaterThan(0);
  });

  it('returns callable function metadata with confirmation policy', async () => {
    const response = await request(buildApp())
      .get('/capabilities/functions')
      .expect(200);

    const projectCreate = response.body.data.functions.find(fn => fn.name === 'projects.create');
    expect(projectCreate.confirmationPolicy).toBe('preview_then_confirm');
    expect(projectCreate.renderHints.cardType).toBe('projects');
  });
});
