import express from 'express';
import pool from '../db.js';
import {
  requestIdMiddleware,
  envelopeMiddleware,
  sendOk,
  sendError,
  asyncHandler
} from '../utils/apiEnvelope.js';
import {
  API_SCOPES,
  apiAuthenticate,
  allScopesForUser,
  requireScopes
} from '../services/apiAuthService.js';
import CapabilityRegistryService from '../services/CapabilityRegistryService.js';
import ActionQueueService from '../services/ActionQueueService.js';

const router = express.Router();

const memoryCategories = new Set([
  'project_goals',
  'preferences',
  'relevant_work_conversations',
  'automation_history',
  'task_history',
  'community_participation'
]);

const nextQuestions = {
  project: ['What outcome should this project produce?', 'Who is the intended community or audience?', 'What deadline or cadence matters?'],
  task: ['Which project should this task belong to?', 'What skill or role is required?', 'What would count as done?'],
  automation: ['What target should the automation inspect?', 'Should this run once or on a schedule?', 'Who should receive the result?'],
  search: ['Which domain should I search first?', 'Should results be limited to your work or the whole platform?']
};

router.use(requestIdMiddleware);
router.use(envelopeMiddleware);
router.use((req, res, next) => {
  res.setHeader('Deprecation', 'true');
  res.setHeader('Link', '</api/v1>; rel="successor-version"');
  res.setHeader('Sunset', 'Wed, 31 Dec 2026 23:59:59 GMT');
  next();
});
router.use(apiAuthenticate);

function inferIntent(message = '') {
  const text = String(message).toLowerCase();
  if (text.includes('quality') || text.includes('check') || text.includes('automation') || text.includes('remind')) return 'automation';
  if (text.includes('task') || text.includes('todo') || text.includes('submission')) return 'task';
  if (text.includes('project') || text.includes('plan') || text.includes('milestone')) return 'project';
  if (text.includes('stat') || text.includes('level') || text.includes('rank')) return 'stats';
  return 'search';
}

function analyzeDraft(intent, draft = {}) {
  const requiredByIntent = {
    project: ['name', 'description', 'outcomeStatement'],
    task: ['projectId', 'name', 'description'],
    automation: ['templateKey', 'targetType', 'targetId'],
    stats: [],
    search: ['query']
  };
  const required = requiredByIntent[intent] || [];
  const fulfilledFields = Object.fromEntries(required.filter(field => draft[field]).map(field => [field, draft[field]]));
  const missingFields = required.filter(field => !draft[field]);
  return {
    fulfilledFields,
    missingFields,
    recommendedNextQuestions: missingFields.length > 0 ? (nextQuestions[intent] || nextQuestions.search) : [],
    readyToCreate: missingFields.length === 0
  };
}

router.get('/auth/permissions', (req, res) => {
  const scopes = req.apiAuth?.type === 'auth0'
    ? allScopesForUser(req.user)
    : req.apiAuth?.scopes || [];

  return sendOk(req, res, {
    actor: req.user ? {
      id: req.user.id,
      username: req.user.username,
      email: req.user.email || null,
      roles: req.user.roles || []
    } : null,
    authType: req.apiAuth?.type || 'unknown',
    scopes,
    policies: {
      mutationRequiresPreview: true,
      automationRequiresAction: true,
      destructiveActionRequiresExplicitRiskAcceptance: true
    }
  });
});

router.post('/ai/intent-route', requireScopes([API_SCOPES.AI_ROUTE]), (req, res) => {
  const { message = '', context = {} } = req.body;
  const intent = inferIntent(message);
  const suggestedFunctions = {
    project: ['projects.create', 'tasks.create'],
    task: ['tasks.create'],
    automation: ['automation.run_quality_checks'],
    stats: ['stats.get'],
    search: ['search.query']
  }[intent] || ['search.query'];

  return sendOk(req, res, {
    intent,
    taxonomyVersion: '1.0.0',
    confidence: intent === 'search' ? 0.5 : 0.72,
    entities: context.entities || {},
    suggestedFunctions,
    missingInputs: analyzeDraft(intent, context.draft || {}).missingFields,
    confirmationRequired: suggestedFunctions.some(name => CapabilityRegistryService.findFunctionByName(name)?.confirmationRequired)
  });
});

router.post('/ai/planning/analyze', requireScopes([API_SCOPES.AI_ROUTE]), (req, res) => {
  const { idea = '', draft = {}, intent: requestedIntent } = req.body;
  const intent = requestedIntent || inferIntent(idea);
  const analysis = analyzeDraft(intent, draft);
  return sendOk(req, res, {
    intent,
    idea,
    ...analysis
  });
});

router.get('/capabilities/functions', requireScopes([API_SCOPES.CAPABILITIES_READ]), (req, res) => {
  const functions = CapabilityRegistryService.listFunctions(req.apiAuth?.scopes || []).map(fn => ({
    ...fn,
    permissions: fn.scope ? [fn.scope] : [],
    confirmationPolicy: fn.confirmationRequired ? 'preview_then_confirm' : 'none',
    renderHints: {
      cardType: fn.domain,
      primaryAction: fn.confirmationRequired ? 'preview' : 'open'
    }
  }));
  return sendOk(req, res, { functions, version: '1.0.0' });
});

router.post('/actions/preview', requireScopes([API_SCOPES.ACTIONS_WRITE]), asyncHandler(async (req, res) => {
  const { intent, previewPayload, sourceClient, riskLevel, actorBotIdentity } = req.body;
  if (!intent || typeof intent !== 'object') {
    return sendError(req, res, 400, 'intent object is required');
  }

  const action = await ActionQueueService.createPreview({
    actorUserId: req.user?.id,
    actorBotIdentity,
    sourceClient: sourceClient || req.apiAuth?.clientName || 'kamiya',
    intent,
    previewPayload,
    riskLevel
  });

  return sendOk(req, res, action, 201);
}));

router.post('/actions/:id/confirm', requireScopes([API_SCOPES.ACTIONS_WRITE]), asyncHandler(async (req, res) => {
  const scopes = req.apiAuth?.type === 'auth0'
    ? allScopesForUser(req.user)
    : req.apiAuth?.scopes || [];
  const action = await ActionQueueService.confirmAction({
    actionId: req.params.id,
    actorUserId: req.user?.id,
    scopes,
    roles: req.user?.roles || [],
    confirmation: req.body || {}
  });
  return sendOk(req, res, action);
}));

router.post('/actions/:id/cancel', requireScopes([API_SCOPES.ACTIONS_WRITE]), asyncHandler(async (req, res) => {
  const action = await ActionQueueService.cancelAction({
    actionId: req.params.id,
    actorUserId: req.user?.id,
    reason: req.body?.reason
  });
  return sendOk(req, res, action);
}));

router.get('/actions', requireScopes([API_SCOPES.ACTIONS_READ]), asyncHandler(async (req, res) => {
  const actions = await ActionQueueService.listActions({
    actorUserId: req.query.userId || req.user?.id,
    projectId: req.query.projectId,
    taskId: req.query.taskId,
    communityId: req.query.communityId,
    automationRunId: req.query.automationRunId,
    status: req.query.status,
    limit: req.query.limit
  });
  return sendOk(req, res, { actions });
}));

router.get('/automation/templates', requireScopes([API_SCOPES.AUTOMATION_READ]), (req, res) => {
  return sendOk(req, res, {
    templates: CapabilityRegistryService.listAutomationTemplates(req.apiAuth?.scopes || []).map(template => ({
      ...template,
      requiredPermissions: ['automation:write'],
      requiredInputs: template.key === 'run_quality_checks' ? ['targetType', 'targetId'] : ['targetType', 'targetId', 'instructions'],
      confirmationPolicy: 'preview_then_confirm',
      renderHints: { cardType: 'automation_template', accent: template.riskLevel }
    }))
  });
});

router.post('/automation/actions', requireScopes([API_SCOPES.AUTOMATION_WRITE]), asyncHandler(async (req, res) => {
  const { templateKey, input = {}, sourceClient, actorBotIdentity } = req.body;
  if (!templateKey) {
    return sendError(req, res, 400, 'templateKey is required');
  }
  if (templateKey === 'run_quality_checks') {
    return sendError(
      req,
      res,
      409,
      'run_quality_checks is task-owned automation. Create a task automation preparation and preview that preparation instead.'
    );
  }

  const template = CapabilityRegistryService.findAutomationTemplate(templateKey);
  if (!template) {
    return sendError(req, res, 404, 'Automation template not found');
  }

  const action = await ActionQueueService.createPreview({
    actorUserId: req.user?.id,
    actorBotIdentity,
    sourceClient: sourceClient || req.apiAuth?.clientName || 'kamiya',
    intent: {
      type: `automation.${templateKey}`,
      automation: { templateKey, input },
      relatedProjectId: input.projectId || null,
      relatedTaskId: input.taskId || null,
      relatedCommunityId: input.communityId || null
    },
    previewPayload: {
      title: template.name,
      summary: `${template.name} will run in Cerbanimo after confirmation.`,
      template,
      input,
      confirmationRequired: true,
      renderHints: { cardType: 'automation_preview' }
    },
    riskLevel: template.riskLevel
  });

  return sendOk(req, res, { action, template }, 201);
}));

router.get('/automation/validation-report', requireScopes([API_SCOPES.AUTOMATION_READ]), asyncHandler(async (req, res) => {
  const { targetType = 'task', targetId } = req.query;
  const checks = [];
  let target = null;

  if (targetType === 'task' && targetId) {
    const result = await pool.query(
      'SELECT id, name, status, submitted, proof_of_work_links, reflection FROM tasks WHERE id = $1',
      [targetId]
    );
    target = result.rows[0] || null;
    checks.push(
      { key: 'task_exists', ok: Boolean(target), message: target ? 'Task found.' : 'Task not found.' },
      { key: 'submitted', ok: Boolean(target?.submitted), message: target?.submitted ? 'Task has been submitted.' : 'Task has not been submitted.' },
      { key: 'proof_links', ok: Boolean(target?.proof_of_work_links?.length), message: target?.proof_of_work_links?.length ? 'Proof links are present.' : 'No proof links attached.' },
      { key: 'reflection', ok: Boolean(target?.reflection), message: target?.reflection ? 'Reflection is present.' : 'No reflection provided.' }
    );
  } else {
    checks.push({ key: 'target_supported', ok: false, message: 'Validation report currently supports task targets.' });
  }

  return sendOk(req, res, {
    targetType,
    targetId: targetId || null,
    generatedAt: new Date().toISOString(),
    passed: checks.length > 0 && checks.every(check => check.ok),
    checks,
    target
  });
}));

router.get('/search', requireScopes([API_SCOPES.SEARCH]), asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) return sendOk(req, res, { results: [] });
  const like = `%${q}%`;

  const queries = await Promise.allSettled([
    pool.query('SELECT id, username AS title, email AS subtitle FROM users WHERE username ILIKE $1 OR email ILIKE $1 LIMIT 5', [like]),
    pool.query('SELECT id, name AS title, description AS subtitle FROM projects WHERE name ILIKE $1 OR description ILIKE $1 LIMIT 5', [like]),
    pool.query('SELECT id, name AS title, status AS subtitle FROM tasks WHERE name ILIKE $1 OR description ILIKE $1 LIMIT 5', [like]),
    pool.query('SELECT id, name AS title, description AS subtitle FROM communities WHERE name ILIKE $1 OR description ILIKE $1 LIMIT 5', [like]),
    pool.query('SELECT id, name AS title, description AS subtitle FROM skills WHERE name ILIKE $1 OR description ILIKE $1 LIMIT 5', [like]),
    pool.query('SELECT id, name AS title, status AS subtitle FROM needs WHERE name ILIKE $1 OR description ILIKE $1 LIMIT 5', [like]),
    pool.query('SELECT id, name AS title, description AS subtitle FROM projects WHERE is_service = TRUE AND (name ILIKE $1 OR description ILIKE $1) LIMIT 5', [like]),
    pool.query('SELECT id, title, status AS subtitle FROM bounties WHERE title ILIKE $1 OR description ILIKE $1 LIMIT 5', [like])
  ]);

  const types = ['user', 'project', 'task', 'community', 'skill', 'need', 'service', 'bounty'];
  const results = queries.flatMap((query, index) => query.status === 'fulfilled'
    ? query.value.rows.map(row => ({ type: types[index], ...row }))
    : []);

  return sendOk(req, res, { results });
}));

router.get('/stats/me', requireScopes([API_SCOPES.READ_STATS]), asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return sendError(req, res, 401, 'User context not found');

  const [user, taskStats, projectStats] = await Promise.all([
    pool.query(
      `SELECT id, username, skills, cotokens, token_ledger, experience, badges
       FROM users WHERE id = $1`,
      [userId]
    ),
    pool.query(
      `SELECT
         COUNT(*)::int AS assigned_count,
         COUNT(*) FILTER (WHERE status::text ILIKE 'completed%')::int AS completed_count,
         COUNT(*) FILTER (WHERE submitted = TRUE)::int AS submitted_count
       FROM tasks
       WHERE $1 = ANY(assigned_user_ids) OR creator_id = $1`,
      [userId]
    ),
    pool.query(
      `SELECT
         COUNT(*)::int AS created_count,
         COUNT(*) FILTER (WHERE status = 'completed')::int AS completed_count
       FROM projects
       WHERE creator_id = $1`,
      [userId]
    )
  ]);

  const profile = user.rows[0];
  return sendOk(req, res, {
    profile,
    tokens: { cotokens: profile?.cotokens || 0, ledger: profile?.token_ledger || [] },
    skills: profile?.skills || [],
    badges: profile?.badges || [],
    experience: profile?.experience || [],
    tasks: taskStats.rows[0],
    projects: projectStats.rows[0],
    rankings: { available: false, reason: 'Ranking service not yet formalized.' },
    streaks: { available: false, reason: 'Quest streak service not yet formalized.' }
  });
}));

router.post('/memory', requireScopes([API_SCOPES.MEMORY_WRITE]), asyncHandler(async (req, res) => {
  const { category, content, metadata = {}, sourceClient, relatedProjectId, relatedTaskId, relatedCommunityId } = req.body;
  if (!memoryCategories.has(category)) {
    return sendError(req, res, 400, 'Invalid memory category', { allowedCategories: [...memoryCategories] });
  }
  if (!content || String(content).trim().length < 3) {
    return sendError(req, res, 400, 'content is required');
  }

  const result = await pool.query(
    `INSERT INTO work_memory (
       user_id, category, content, metadata, source_client,
       related_project_id, related_task_id, related_community_id
     )
     VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8)
     RETURNING *`,
    [
      req.user?.id,
      category,
      String(content).trim(),
      JSON.stringify(metadata),
      sourceClient || req.apiAuth?.clientName || 'kamiya',
      relatedProjectId || null,
      relatedTaskId || null,
      relatedCommunityId || null
    ]
  );

  return sendOk(req, res, result.rows[0], 201);
}));

router.get('/render/page', requireScopes([API_SCOPES.RENDER_READ]), asyncHandler(async (req, res) => {
  const { type = 'dashboard', id } = req.query;
  const descriptor = {
    type,
    id: id || null,
    generatedAt: new Date().toISOString(),
    cards: [],
    actions: [],
    routeHints: {}
  };

  if (type === 'dashboard') {
    descriptor.cards.push({ type: 'stats_summary', source: '/stats/me' });
    descriptor.cards.push({ type: 'actions_queue', source: '/actions' });
    descriptor.routeHints.web = '/dashboard';
  } else if (type === 'profile') {
    descriptor.cards.push({ type: 'profile_header', source: '/profile' });
    descriptor.cards.push({ type: 'skills', source: '/stats/me' });
    descriptor.routeHints.web = id ? `/userportfolio/${id}` : '/profile';
  } else if (type === 'project') {
    descriptor.cards.push({ type: 'project_summary', source: id ? `/projects/${id}` : '/projects' });
    descriptor.cards.push({ type: 'project_tasks', source: id ? `/tasks/p/${id}` : '/tasks' });
    descriptor.routeHints.web = id ? `/projects/${id}` : '/projects';
  } else if (type === 'task') {
    descriptor.cards.push({ type: 'task_detail', source: id ? `/tasks/${id}` : '/tasks' });
    descriptor.routeHints.web = id ? `/tasks/${id}` : '/tasks';
  } else if (['timeline', 'approval', 'statistics'].includes(type)) {
    descriptor.cards.push({ type: `${type}_summary`, source: type === 'statistics' ? '/stats/me' : '/actions' });
  } else {
    return sendError(req, res, 400, 'Unsupported render page type');
  }

  return sendOk(req, res, descriptor);
}));

router.use((err, req, res, next) => {
  console.error('Platform API error:', err);
  const status = err.status || err.statusCode || 500;
  return sendError(req, res, status, err.message || 'Internal server error', err.details || null);
});

export default router;
