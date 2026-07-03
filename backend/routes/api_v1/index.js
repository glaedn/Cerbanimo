import express from 'express';
import pool from '../../db.js';
import projectRoutes from '../projects.js';
import taskRoutes from '../tasks.js';
import communitiesRoutes from '../communities.js';
import profileRoutes from '../profile.js';
import notificationRoutes from '../notifications.js';
import resolveUser from '../../middlewares/resolveUser.js';
import {
  requestIdMiddleware,
  envelopeMiddleware,
  sendOk,
  sendError,
  asyncHandler
} from '../../utils/apiEnvelope.js';
import {
  API_SCOPES,
  DEFAULT_API_TOKEN_SCOPES,
  apiAuthenticate,
  allScopesForUser,
  createApiToken,
  requireReadWriteScopes,
  requireScopes
} from '../../services/apiAuthService.js';
import CapabilityRegistryService from '../../services/CapabilityRegistryService.js';
import ActionQueueService from '../../services/ActionQueueService.js';
import ProjectBootstrapService from '../../services/ProjectBootstrapService.js';
import TaskAutomationPreparationService from '../../services/TaskAutomationPreparationService.js';
import { serializeTaskAutomation } from '../../services/TaskAutomationClassificationService.js';

const router = express.Router();

router.use(requestIdMiddleware);
router.use(envelopeMiddleware);

function actionAuthContext(req) {
  const scopes = req.apiAuth?.type === 'auth0'
    ? allScopesForUser(req.user)
    : req.apiAuth?.scopes || [];
  return {
    actorUserId: req.user?.id || null,
    isServiceActor: req.apiAuth?.type === 'apiToken' && scopes.includes(API_SCOPES.ACTIONS_SERVICE)
  };
}

function actorScopes(req) {
  return req.apiAuth?.type === 'auth0'
    ? allScopesForUser(req.user)
    : req.apiAuth?.scopes || [];
}

const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'Cerbanimo Public API',
    version: '1.0.0',
    description: 'Versioned API surface for standalone clients such as Kamiya.'
  },
  servers: [{ url: '/api/v1' }],
  security: [{ bearerAuth: [] }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        description: 'Auth0 JWT or Cerbanimo scoped API token.'
      }
    },
    schemas: {
      Envelope: {
        type: 'object',
        properties: {
          ok: { type: 'boolean' },
          data: {},
          error: {
            anyOf: [
              { type: 'null' },
              {
                type: 'object',
                properties: {
                  code: {},
                  message: { type: 'string' },
                  details: {}
                }
              }
            ]
          },
          requestId: { type: 'string' }
        }
      },
      TaskAutomation: {
        type: 'object',
        properties: {
          classification: { enum: ['human_driven', 'assisted_automation', 'fully_automatable'] },
          confidenceBand: { enum: ['low', 'medium', 'high', null] },
          rationale: { type: 'string' },
          requiredHumanInputs: { type: 'array' },
          requirements: { type: 'object' },
          validationRequirements: { type: 'array' },
          source: { enum: ['generated', 'manual', 'legacy_default', 'policy_downgrade', 'review_override'] },
          version: { type: 'string' },
          classifiedAt: {},
          findings: { type: 'array' }
        }
      }
    }
  },
  paths: {
    '/auth/permissions': {
      get: {
        summary: 'Inspect the current actor, scopes, and client permissions.',
        responses: { 200: { description: 'Permission envelope' } }
      }
    },
    '/auth/tokens': {
      post: {
        summary: 'Create a scoped API token for a third-party client.',
        responses: { 201: { description: 'Token created. The raw token is only returned once.' } }
      },
      get: {
        summary: 'List scoped API tokens for the current actor.',
        responses: { 200: { description: 'Token metadata list' } }
      }
    },
    '/projects': { get: { summary: 'List projects' } },
    '/tasks': { get: { summary: 'List tasks' } },
    '/tasks/{id}/automation': { get: { summary: 'Read task automation classification, preparation, and executable capability state' } },
    '/tasks/{id}/automation/preparations': { post: { summary: 'Create or update an actor-owned task automation preparation' } },
    '/tasks/{id}/automation/preparations/{preparationId}': { get: { summary: 'Read an actor-owned task automation preparation' }, patch: { summary: 'Update an actor-owned task automation preparation' } },
    '/tasks/{id}/automation/preparations/{preparationId}/validate': { post: { summary: 'Validate a task automation preparation' } },
    '/tasks/{id}/automation/preparations/{preparationId}/preview': { post: { summary: 'Create a confirmation-gated action preview from a ready preparation' } },
    '/tasks/{id}/automation/preparations/{preparationId}/cancel': { post: { summary: 'Cancel an actor-owned task automation preparation' } },
    '/communities': { get: { summary: 'List communities' } },
    '/profile': { get: { summary: 'Read current actor profile' } },
    '/stats': { get: { summary: 'Read dashboard stats' } },
    '/notifications/{userId}': { get: { summary: 'Read notifications' } },
    '/search': { get: { summary: 'Search users, projects, tasks, and communities' } },
    '/ai/intent-route': { post: { summary: 'Route natural language to Cerbanimo intent taxonomy' } },
    '/ai/planning/analyze': { post: { summary: 'Analyze a work request against function schemas' } },
    '/capabilities/functions': { get: { summary: 'List versioned function schemas' } },
    '/capabilities/prompts': { get: { summary: 'List active prompt registry entries' } },
    '/actions/preview': { post: { summary: 'Create a persisted action preview' } },
    '/actions/{id}': { get: { summary: 'Read action, workflow, project, and active task detail' } },
    '/actions/{id}/confirm': { post: { summary: 'Confirm a previewed action' } },
    '/actions/{id}/cancel': { post: { summary: 'Cancel a previewed or confirmed action' } },
    '/actions/{id}/retry': { post: { summary: 'Requeue a retryable project bootstrap workflow' } },
    '/actions': { get: { summary: 'List actor action history' } },
    '/automation/templates': { get: { summary: 'List automation templates' } },
    '/automation/actions': { post: { summary: 'Create an automation action preview' } },
    '/automation/runs/{id}': { get: { summary: 'Read automation run and logs' } },
    '/automation/validation-report': { get: { summary: 'Read automation readiness report' } }
  }
};

router.get('/openapi.json', (req, res) => sendOk(req, res, openApiDocument));
router.get('/docs', (req, res) => sendOk(req, res, {
  openapi: '/api/v1/openapi.json',
  note: 'Use the OpenAPI document with Swagger UI, Redoc, or the Kamiya SDK generator.'
}));

router.use(apiAuthenticate);

router.get('/auth/permissions', (req, res) => {
  const scopes = req.apiAuth?.type === 'auth0'
    ? allScopesForUser(req.user)
    : req.apiAuth?.scopes || [];

  return sendOk(req, res, {
    actor: req.user
      ? {
          id: req.user.id,
          username: req.user.username,
          email: req.user.email || null,
          roles: req.user.roles || []
        }
      : null,
    authType: req.apiAuth?.type || 'unknown',
    client: {
      tokenId: req.apiAuth?.tokenId || null,
      tokenName: req.apiAuth?.tokenName || null,
      clientName: req.apiAuth?.clientName || null
    },
    scopes,
    availableScopes: Object.values(API_SCOPES),
    policies: {
      mutationsRequireActionPreview: true,
      destructiveActionsRequireExplicitRiskAcceptance: true,
      automationRequiresPersistedAction: true
    }
  });
});

router.get('/auth/tokens', requireScopes([API_SCOPES.TOKENS_WRITE]), asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT id, name, scopes, client_name, last_used_at, expires_at, revoked_at, created_at
     FROM api_tokens
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [req.user.id]
  );
  return sendOk(req, res, result.rows);
}));

router.post('/auth/tokens', requireScopes([API_SCOPES.TOKENS_WRITE]), asyncHandler(async (req, res) => {
  const { name, scopes, clientName, expiresAt } = req.body;
  if (!name) {
    return sendError(req, res, 400, 'Token name is required');
  }

  const { token, tokenRecord } = await createApiToken({
    userId: req.user.id,
    name,
    scopes: scopes || DEFAULT_API_TOKEN_SCOPES,
    clientName,
    expiresAt
  });

  return sendOk(req, res, {
    token,
    tokenRecord,
    warning: 'Store this token now. Cerbanimo only returns the raw token once.'
  }, 201);
}));

router.post('/auth/tokens/:id/revoke', requireScopes([API_SCOPES.TOKENS_WRITE]), asyncHandler(async (req, res) => {
  const result = await pool.query(
    `UPDATE api_tokens
     SET revoked_at = NOW()
     WHERE id = $1 AND user_id = $2
     RETURNING id, name, revoked_at`,
    [req.params.id, req.user.id]
  );
  if (result.rows.length === 0) {
    return sendError(req, res, 404, 'API token not found');
  }
  return sendOk(req, res, result.rows[0]);
}));

router.get('/capabilities/functions', requireScopes([API_SCOPES.CAPABILITIES_READ]), (req, res) => {
  return sendOk(req, res, {
    functions: CapabilityRegistryService.listFunctions(req.apiAuth?.scopes || []),
    version: '1.0.0'
  });
});

router.get('/capabilities/prompts', requireScopes([API_SCOPES.CAPABILITIES_READ]), asyncHandler(async (req, res) => {
  const prompts = await CapabilityRegistryService.listPrompts();
  return sendOk(req, res, { prompts });
}));

router.post('/ai/intent-route', requireScopes([API_SCOPES.AI_ROUTE]), (req, res) => {
  const { message = '', context = {} } = req.body;
  const text = String(message).toLowerCase();
  const matches = [];

  if (text.includes('project') || text.includes('plan')) matches.push('projects.bootstrap');
  if (text.includes('task') || text.includes('todo')) matches.push('tasks.create');
  if (text.includes('community')) matches.push('communities.list');
  if (text.includes('stat') || text.includes('dashboard')) matches.push('stats.get');
  if (text.includes('quality') || text.includes('check')) matches.push('automation.run_quality_checks');
  if (text.includes('remind')) matches.push('automation.reminders');

  const suggestedFunctions = matches.length > 0 ? matches : ['search.query'];
  const missingInputs = [];
  if (suggestedFunctions.includes('projects.bootstrap') && !context.outcomeStatement) {
    missingInputs.push('outcomeStatement');
  }
  if (suggestedFunctions.includes('tasks.create') && !context.projectId) {
    missingInputs.push('projectId');
  }

  return sendOk(req, res, {
    intent: suggestedFunctions[0].split('.')[0],
    taxonomyVersion: '1.0.0',
    confidence: matches.length > 0 ? 0.72 : 0.45,
    entities: context.entities || {},
    missingInputs,
    suggestedFunctions,
    confirmationRequired: suggestedFunctions.some(name => {
      const schema = CapabilityRegistryService.findFunctionByName(name);
      return schema?.confirmationRequired;
    })
  });
});

router.post('/ai/planning/analyze', requireScopes([API_SCOPES.AI_ROUTE]), (req, res) => {
  const { goal, intent, constraints = [] } = req.body;
  if (!goal && !intent) {
    return sendError(req, res, 400, 'goal or intent is required');
  }

  const functions = CapabilityRegistryService.listFunctions(req.apiAuth?.scopes || [])
    .filter(fn => fn.available)
    .filter(fn => {
      const haystack = `${goal || ''} ${intent || ''}`.toLowerCase();
      return haystack.includes(fn.domain) || haystack.includes(fn.name.split('.')[0]);
    });

  return sendOk(req, res, {
    summary: `Planning analysis prepared for: ${goal || intent}`,
    constraints,
    steps: [
      'Resolve missing inputs through the client conversation.',
      'Create an action preview for any mutation.',
      'Confirm the action before execution.',
      'Hydrate resulting action or automation history from Cerbanimo.'
    ],
    risks: [
      'Permission scope must match the selected function.',
      'Destructive or external-channel actions require higher-risk confirmation.'
    ],
    functions
  });
});

router.post('/actions/preview', requireScopes([API_SCOPES.ACTIONS_WRITE]), asyncHandler(async (req, res) => {
  const { intent, previewPayload, sourceClient, riskLevel } = req.body;
  if (!intent || typeof intent !== 'object') {
    return sendError(req, res, 400, 'intent object is required');
  }
  const functionName = intent.functionName || intent.function || intent.type;
  if (functionName === 'projects.bootstrap') {
    const scopes = req.apiAuth?.type === 'auth0'
      ? allScopesForUser(req.user)
      : req.apiAuth?.scopes || [];
    if (!scopes.includes(API_SCOPES.WRITE_PROJECTS)) {
      return sendError(req, res, 403, 'projects.bootstrap requires projects:write scope');
    }
  }

  const action = await ActionQueueService.createPreview({
    actorUserId: req.user?.id,
    sourceClient: sourceClient || req.apiAuth?.clientName || 'api',
    intent,
    previewPayload,
    riskLevel
  });

  return sendOk(req, res, action, 201);
}));

router.get('/actions', requireScopes([API_SCOPES.ACTIONS_READ]), asyncHandler(async (req, res) => {
  const authContext = actionAuthContext(req);
  const actions = await ActionQueueService.listActions({
    actorUserId: authContext.actorUserId,
    isServiceActor: authContext.isServiceActor,
    targetActorUserId: authContext.isServiceActor ? req.query.actorUserId : null,
    limit: req.query.limit,
    status: req.query.status
  });
  return sendOk(req, res, { actions });
}));

router.get('/actions/:id', requireScopes([API_SCOPES.ACTIONS_READ]), asyncHandler(async (req, res) => {
  const authContext = actionAuthContext(req);
  const detail = await ProjectBootstrapService.hydrateActionDetail(req.params.id, authContext);
  if (!detail) {
    return sendError(req, res, 404, 'Action not found');
  }
  return sendOk(req, res, detail);
}));

router.get('/tasks', requireScopes([API_SCOPES.READ_TASKS]), asyncHandler(async (req, res) => {
  const q = String(req.query.query || req.query.q || '').trim();
  const params = [];
  let where = '';
  if (q) {
    params.push(`%${q}%`);
    where = 'WHERE t.name ILIKE $1 OR t.description ILIKE $1';
  }
  const result = await pool.query(
    `SELECT t.*, s.name AS skill_name
     FROM tasks t
     LEFT JOIN skills s ON t.skill_id = s.id
     ${where}
     ORDER BY t.created_at DESC
     LIMIT 50`,
    params
  );
  return sendOk(req, res, {
    tasks: result.rows.map(toCanonicalTask)
  });
}));

router.get('/tasks/:taskId/automation', requireScopes([API_SCOPES.READ_TASKS, API_SCOPES.AUTOMATION_READ]), asyncHandler(async (req, res) => {
  const context = await TaskAutomationPreparationService.getTaskAutomationContext({
    taskId: req.params.taskId,
    actorUserId: req.user?.id,
    scopes: actorScopes(req)
  });
  if (!context) return sendError(req, res, 404, 'Task not found');
  return sendOk(req, res, context);
}));

router.post('/tasks/:taskId/automation/preparations', requireScopes([API_SCOPES.AUTOMATION_WRITE]), asyncHandler(async (req, res) => {
  const context = await TaskAutomationPreparationService.createPreparation({
    taskId: req.params.taskId,
    actorUserId: req.user?.id,
    scopes: actorScopes(req),
    capabilityName: req.body?.capabilityName || req.body?.capability_name,
    inputValues: req.body?.inputValues || req.body?.input_values || {}
  });
  return sendOk(req, res, context, 201);
}));

router.get('/tasks/:taskId/automation/preparations/:preparationId', requireScopes([API_SCOPES.AUTOMATION_READ]), asyncHandler(async (req, res) => {
  const context = await TaskAutomationPreparationService.getPreparation({
    taskId: req.params.taskId,
    preparationId: req.params.preparationId,
    actorUserId: req.user?.id,
    scopes: actorScopes(req)
  });
  if (!context) return sendError(req, res, 404, 'Task automation preparation not found');
  return sendOk(req, res, context);
}));

router.patch('/tasks/:taskId/automation/preparations/:preparationId', requireScopes([API_SCOPES.AUTOMATION_WRITE]), asyncHandler(async (req, res) => {
  const context = await TaskAutomationPreparationService.updatePreparation({
    taskId: req.params.taskId,
    preparationId: req.params.preparationId,
    actorUserId: req.user?.id,
    scopes: actorScopes(req),
    inputValues: req.body?.inputValues || req.body?.input_values || {},
    status: req.body?.status
  });
  return sendOk(req, res, context);
}));

router.post('/tasks/:taskId/automation/preparations/:preparationId/validate', requireScopes([API_SCOPES.AUTOMATION_WRITE]), asyncHandler(async (req, res) => {
  const context = await TaskAutomationPreparationService.validatePreparation({
    taskId: req.params.taskId,
    preparationId: req.params.preparationId,
    actorUserId: req.user?.id,
    scopes: actorScopes(req)
  });
  return sendOk(req, res, context);
}));

router.post('/tasks/:taskId/automation/preparations/:preparationId/preview', requireScopes([API_SCOPES.AUTOMATION_WRITE, API_SCOPES.ACTIONS_WRITE]), asyncHandler(async (req, res) => {
  const context = await TaskAutomationPreparationService.previewPreparation({
    taskId: req.params.taskId,
    preparationId: req.params.preparationId,
    actorUserId: req.user?.id,
    scopes: actorScopes(req),
    sourceClient: req.body?.sourceClient || req.apiAuth?.clientName || 'api'
  });
  return sendOk(req, res, context, 201);
}));

router.post('/tasks/:taskId/automation/preparations/:preparationId/cancel', requireScopes([API_SCOPES.AUTOMATION_WRITE]), asyncHandler(async (req, res) => {
  const preparation = await TaskAutomationPreparationService.cancelPreparation({
    taskId: req.params.taskId,
    preparationId: req.params.preparationId,
    actorUserId: req.user?.id,
    reason: req.body?.reason
  });
  if (!preparation) return sendError(req, res, 404, 'Task automation preparation not found');
  return sendOk(req, res, { preparation });
}));

router.get('/tasks/:id', requireScopes([API_SCOPES.READ_TASKS]), asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT t.*, s.name AS skill_name
     FROM tasks t
     LEFT JOIN skills s ON t.skill_id = s.id
     WHERE t.id::text = $1
     LIMIT 1`,
    [String(req.params.id)]
  );
  if (!result.rows[0]) return sendError(req, res, 404, 'Task not found');
  return sendOk(req, res, toCanonicalTask(result.rows[0]));
}));

router.post('/actions/:id/confirm', requireScopes([API_SCOPES.ACTIONS_WRITE]), asyncHandler(async (req, res) => {
  const authContext = actionAuthContext(req);
  const action = await ActionQueueService.confirmAction({
    actionId: req.params.id,
    actorUserId: authContext.actorUserId,
    isServiceActor: authContext.isServiceActor,
    confirmation: req.body || {}
  });
  return sendOk(req, res, action, action.status === 'confirmed' ? 202 : 200);
}));

router.post('/actions/:id/cancel', requireScopes([API_SCOPES.ACTIONS_WRITE]), asyncHandler(async (req, res) => {
  const authContext = actionAuthContext(req);
  const action = await ActionQueueService.cancelAction({
    actionId: req.params.id,
    actorUserId: authContext.actorUserId,
    isServiceActor: authContext.isServiceActor,
    reason: req.body?.reason
  });
  return sendOk(req, res, action);
}));

router.post('/actions/:id/retry', requireScopes([API_SCOPES.ACTIONS_WRITE]), asyncHandler(async (req, res) => {
  const authContext = actionAuthContext(req);
  const action = await ActionQueueService.retryAction({
    actionId: req.params.id,
    actorUserId: authContext.actorUserId,
    isServiceActor: authContext.isServiceActor,
    reason: req.body?.reason
  });
  return sendOk(req, res, action, 202);
}));

router.get('/automation/templates', requireScopes([API_SCOPES.AUTOMATION_READ]), (req, res) => {
  return sendOk(req, res, {
    templates: CapabilityRegistryService.listAutomationTemplates(req.apiAuth?.scopes || [])
  });
});

router.post('/automation/actions', requireScopes([API_SCOPES.AUTOMATION_WRITE]), asyncHandler(async (req, res) => {
  const { templateKey, input = {}, sourceClient } = req.body;
  if (!templateKey) {
    return sendError(req, res, 400, 'templateKey is required');
  }

  const template = CapabilityRegistryService.findAutomationTemplate(templateKey);
  if (!template) {
    return sendError(req, res, 404, 'Automation template not found');
  }

  const action = await ActionQueueService.createPreview({
    actorUserId: req.user?.id,
    sourceClient: sourceClient || req.apiAuth?.clientName || 'api',
    intent: {
      type: `automation.${templateKey}`,
      automation: { templateKey, input },
      summary: `Run automation: ${template.name}`,
      input
    },
    previewPayload: {
      title: template.name,
      summary: `${template.name} will be queued only after confirmation.`,
      template,
      input,
      confirmationRequired: true,
      effects: ['Create automation run record', 'Write audit logs']
    },
    riskLevel: template.riskLevel
  });

  return sendOk(req, res, { action, template }, 201);
}));

router.get('/automation/runs/:id', requireScopes([API_SCOPES.AUTOMATION_READ]), asyncHandler(async (req, res) => {
  const run = await ActionQueueService.getAutomationRun(req.params.id, actionAuthContext(req));
  if (!run) {
    return sendError(req, res, 404, 'Automation run not found');
  }
  return sendOk(req, res, run);
}));

router.get('/automation/validation-report', requireScopes([API_SCOPES.AUTOMATION_READ]), (req, res) => {
  const templates = CapabilityRegistryService.listAutomationTemplates(req.apiAuth?.scopes || []);
  return sendOk(req, res, {
    generatedAt: new Date().toISOString(),
    checks: [
      { key: 'persisted_actions', ok: true, message: 'Automation creation routes persist an api_actions preview.' },
      { key: 'confirmation_required', ok: true, message: 'Automation runs are queued only through action confirmation.' },
      { key: 'auditable_logs', ok: true, message: 'Queued runs write automation_logs entries.' },
      { key: 'idempotency_policy', ok: false, message: 'Worker-level idempotency keys must be implemented per template.' },
      { key: 'retry_policy', ok: false, message: 'Worker retry/backoff policy is reserved for the worker implementation pass.' }
    ],
    templates
  });
});

router.get('/stats', requireScopes([API_SCOPES.READ_STATS]), asyncHandler(async (req, res) => {
  const [projects, tasks, communities, notifications] = await Promise.all([
    pool.query('SELECT COUNT(*)::int AS count FROM projects'),
    pool.query(`SELECT status, COUNT(*)::int AS count FROM tasks GROUP BY status ORDER BY status ASC`),
    pool.query('SELECT COUNT(*)::int AS count FROM communities'),
    req.user?.id
      ? pool.query('SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND read = FALSE', [req.user.id])
      : Promise.resolve({ rows: [{ count: 0 }] })
  ]);

  return sendOk(req, res, {
    projects: { total: projects.rows[0]?.count || 0 },
    tasks: {
      total: tasks.rows.reduce((sum, row) => sum + row.count, 0),
      byStatus: tasks.rows
    },
    communities: { total: communities.rows[0]?.count || 0 },
    notifications: { unread: notifications.rows[0]?.count || 0 }
  });
}));

router.get('/search', requireScopes([API_SCOPES.SEARCH]), asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) {
    return sendOk(req, res, { results: [] });
  }
  const like = `%${q}%`;

  const [users, projects, tasks, communities] = await Promise.all([
    pool.query('SELECT id, username AS title, profile_picture AS image FROM users WHERE username ILIKE $1 LIMIT 5', [like]),
    pool.query('SELECT id, name AS title, description FROM projects WHERE name ILIKE $1 OR description ILIKE $1 LIMIT 5', [like]),
    pool.query('SELECT id, name AS title, description, status FROM tasks WHERE name ILIKE $1 OR description ILIKE $1 LIMIT 5', [like]),
    pool.query('SELECT id, name AS title, description FROM communities WHERE name ILIKE $1 OR description ILIKE $1 LIMIT 5', [like])
  ]);

  return sendOk(req, res, {
    results: [
      ...users.rows.map(item => ({ type: 'profile', ...item })),
      ...projects.rows.map(item => ({ type: 'project', ...item })),
      ...tasks.rows.map(item => ({ type: 'task', ...item })),
      ...communities.rows.map(item => ({ type: 'community', ...item }))
    ]
  });
}));

router.use('/projects', requireReadWriteScopes(API_SCOPES.READ_PROJECTS, API_SCOPES.WRITE_PROJECTS), resolveUser, projectRoutes);
router.use('/tasks', requireReadWriteScopes(API_SCOPES.READ_TASKS, API_SCOPES.WRITE_TASKS), resolveUser, taskRoutes);
router.use('/communities', requireReadWriteScopes(API_SCOPES.READ_COMMUNITIES, API_SCOPES.WRITE_COMMUNITIES), resolveUser, communitiesRoutes);
router.use('/profile', requireReadWriteScopes(API_SCOPES.READ_PROFILE, API_SCOPES.WRITE_PROFILE), resolveUser, profileRoutes);
router.use('/notifications', requireReadWriteScopes(API_SCOPES.READ_NOTIFICATIONS, API_SCOPES.WRITE_NOTIFICATIONS), resolveUser, notificationRoutes);

router.use((err, req, res, next) => {
  console.error('API v1 error:', err);
  const status = err.status || err.statusCode || 500;
  return sendError(req, res, status, err.message || 'Internal server error', err.details || null);
});

export default router;

function toCanonicalTask(task) {
  return {
    ...task,
    automation: serializeTaskAutomation(task)
  };
}
