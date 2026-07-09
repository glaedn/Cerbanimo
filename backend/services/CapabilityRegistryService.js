import pool from '../db.js';

export const functionSchemas = [
  {
    name: 'projects.list',
    domain: 'projects',
    version: '1.0.0',
    scope: 'projects:read',
    description: 'List or search Cerbanimo projects visible to the actor.',
    inputSchema: {
      type: 'object',
      properties: {
        search: { type: 'string' },
        page: { type: 'integer', minimum: 1 }
      }
    },
    outputSchema: { type: 'array', items: { type: 'object' } }
  },
  {
    name: 'projects.create',
    domain: 'projects',
    version: '1.0.0',
    scope: 'projects:write',
    confirmationRequired: true,
    description: 'Create a new project after preview and confirmation.',
    inputSchema: {
      type: 'object',
      required: ['name', 'description', 'outcomeStatement'],
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        outcomeStatement: { type: 'string' },
        dueDate: { type: 'string', format: 'date' },
        tags: { type: 'array', items: { type: 'string' } }
      }
    },
    outputSchema: { type: 'object' }
  },
  {
    name: 'projects.bootstrap',
    domain: 'projects',
    version: '1.0.0',
    scope: 'projects:write',
    confirmationRequired: true,
    async: true,
    description: 'Create a project, generate its project plan and dependency-aware task graph, persist the graph atomically, and activate root tasks.',
    inputSchema: {
      type: 'object',
      required: ['name', 'description', 'outcomeStatement'],
      properties: {
        name: { type: 'string', maxLength: 100 },
        description: { type: 'string' },
        outcomeStatement: { type: 'string' },
        dueDate: { type: 'string', format: 'date-time' },
        tags: { type: 'array', items: { type: 'string' } },
        autoAssign: { type: 'boolean' },
        location: { type: 'object' },
        isService: { type: 'boolean' },
        servicePrice: { type: 'integer', minimum: 0 },
        serviceVisibility: { type: 'array', items: { type: 'string' } },
        generationMode: { type: 'string', enum: ['plan_then_tasks', 'tasks_only'] }
      }
    },
    outputSchema: {
      type: 'object',
      properties: {
        action: { type: 'object' },
        workflow: { type: 'object' },
        project: { type: 'object' },
        tasks: { type: 'array', items: { type: 'object' } },
        activeTasks: { type: 'array', items: { type: 'object' } }
      }
    }
  },
  {
    name: 'projects.create_invite',
    domain: 'projects',
    version: '1.0.0',
    scope: 'projects:write',
    confirmationRequired: true,
    description: 'Create a hashed project party invite for Game Master mode. The raw token is returned once and is never stored.',
    inputSchema: {
      type: 'object',
      required: ['projectId'],
      properties: {
        projectId: { type: 'integer' },
        maxUses: { type: 'integer', minimum: 1, maximum: 50 },
        expiresInHours: { type: 'integer', minimum: 1, maximum: 1440 }
      }
    },
    outputSchema: { type: 'object' }
  },
  {
    name: 'projects.revoke_invite',
    domain: 'projects',
    version: '1.0.0',
    scope: 'projects:write',
    confirmationRequired: true,
    description: 'Revoke an active Game Master party invite for a project.',
    inputSchema: {
      type: 'object',
      required: ['projectId', 'inviteId'],
      properties: {
        projectId: { type: 'integer' },
        inviteId: { type: 'integer' },
        reason: { type: 'string' }
      }
    },
    outputSchema: { type: 'object' }
  },
  {
    name: 'projects.join_from_invite',
    domain: 'projects',
    version: '1.0.0',
    scope: 'projects:write',
    confirmationRequired: true,
    description: 'Redeem a project invite into an active party calling.',
    inputSchema: {
      type: 'object',
      required: ['inviteToken'],
      properties: {
        inviteToken: { type: 'string' }
      }
    },
    outputSchema: { type: 'object' }
  },
  {
    name: 'projects.launch_quest',
    domain: 'projects',
    version: '1.0.0',
    scope: 'projects:write',
    confirmationRequired: true,
    description: 'Create a Game Master launch preview and opening scene without completing work, assigning rewards, or activating dependencies.',
    inputSchema: {
      type: 'object',
      required: ['projectId'],
      properties: {
        projectId: { type: 'integer' }
      }
    },
    outputSchema: { type: 'object' }
  },
  {
    name: 'projects.update_quest_profile',
    domain: 'projects',
    version: '1.0.0',
    scope: 'projects:write',
    confirmationRequired: true,
    description: 'Supersede the active durable quest profile for a project.',
    inputSchema: {
      type: 'object',
      required: ['projectId', 'title', 'premise'],
      properties: {
        projectId: { type: 'integer' },
        title: { type: 'string' },
        premise: { type: 'string' },
        desiredOutcome: { type: 'string' },
        genre: { type: 'string' },
        tone: { type: 'string' },
        stakes: { type: 'string' },
        openingScene: { type: 'string' },
        keyThemes: { type: 'array', items: { type: 'string' } },
        avoidedThemes: { type: 'array', items: { type: 'string' } }
      }
    },
    outputSchema: { type: 'object' }
  },
  {
    name: 'projects.update_narrative_settings',
    domain: 'projects',
    version: '1.0.0',
    scope: 'projects:write',
    confirmationRequired: true,
    description: 'Update project-scoped Game Master presentation settings.',
    inputSchema: {
      type: 'object',
      required: ['projectId'],
      properties: {
        projectId: { type: 'integer' },
        presentationMode: { type: 'string', enum: ['game_master', 'plain'] },
        narrativeIntensity: { type: 'string', enum: ['light', 'standard', 'immersive'] },
        genreOverride: { type: 'string' },
        avoidThemes: { type: 'array', items: { type: 'string' } },
        statDisplayMode: { type: 'string', enum: ['narrative', 'numeric', 'both'] }
      }
    },
    outputSchema: { type: 'object' }
  },
  {
    name: 'projects.update_calling',
    domain: 'projects',
    version: '1.0.0',
    scope: 'projects:write',
    confirmationRequired: true,
    description: 'Update the current actor character calling for a project party.',
    inputSchema: {
      type: 'object',
      required: ['projectId'],
      properties: {
        projectId: { type: 'integer' },
        callingTitle: { type: 'string' },
        roleArchetype: { type: 'string', enum: ['party_member', 'builder', 'organizer', 'reviewer', 'scout', 'scribe', 'guardian', 'steward'] },
        contributionSummary: { type: 'string' },
        skillsSnapshot: { type: 'object' }
      }
    },
    outputSchema: { type: 'object' }
  },
  {
    name: 'tasks.list',
    domain: 'tasks',
    version: '1.0.0',
    scope: 'tasks:read',
    description: 'List tasks globally, by project, or by actor relevance.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'integer' },
        status: { type: 'string' }
      }
    },
    outputSchema: { type: 'array', items: { type: 'object' } }
  },
  {
    name: 'tasks.create',
    domain: 'tasks',
    version: '1.0.0',
    scope: 'tasks:write',
    confirmationRequired: true,
    description: 'Create a project task after preview and confirmation.',
    inputSchema: {
      type: 'object',
      required: ['projectId', 'name', 'description', 'skillId'],
      properties: {
        projectId: { type: 'integer' },
        name: { type: 'string' },
        description: { type: 'string' },
        skillId: { type: 'integer' },
        rewardTokens: { type: 'integer' },
        dependencies: { type: 'array', items: { type: 'integer' } }
      }
    },
    outputSchema: { type: 'object' }
  },
  {
    name: 'communities.list',
    domain: 'communities',
    version: '1.0.0',
    scope: 'communities:read',
    description: 'List communities visible to the actor.',
    inputSchema: { type: 'object', properties: { search: { type: 'string' } } },
    outputSchema: { type: 'array', items: { type: 'object' } }
  },
  {
    name: 'stats.get',
    domain: 'stats',
    version: '1.0.0',
    scope: 'stats:read',
    description: 'Read actor-scoped platform statistics for dashboards and conversational cards.',
    inputSchema: { type: 'object', properties: { communityId: { type: 'integer' } } },
    outputSchema: { type: 'object' }
  },
  {
    name: 'memory.write',
    domain: 'memory',
    version: '0.1.0',
    scope: 'memory:write',
    confirmationRequired: true,
    description: 'Store work-relevant memory under retention policies. Reserved for Phase 5.',
    inputSchema: { type: 'object' },
    outputSchema: { type: 'object' }
  },
  {
    name: 'navigation.render',
    domain: 'navigation',
    version: '0.1.0',
    scope: 'render:read',
    description: 'Render project, profile, task, dashboard, timeline, approval, and stats cards. Reserved for Phase 5.',
    inputSchema: { type: 'object' },
    outputSchema: { type: 'object' }
  },
  {
    name: 'automation.run_quality_checks',
    domain: 'automation',
    version: '1.0.0',
    scope: 'automation:write',
    confirmationRequired: true,
    description: 'Queue quality checks for a project or repository target after confirmation. Task-owned executions should use tasks.run_automation with a persisted preparation.',
    inputSchema: {
      type: 'object',
      required: ['targetType', 'targetId'],
      properties: {
        targetType: { type: 'string', enum: ['project', 'repository'] },
        targetId: { oneOf: [{ type: 'integer' }, { type: 'string' }] }
      }
    },
    outputSchema: { type: 'object' }
  },
  {
    name: 'tasks.run_automation',
    domain: 'tasks',
    version: '1.0.0',
    scope: 'automation:write',
    confirmationRequired: true,
    async: true,
    description: 'Queue a capability-backed task automation from an actor-owned preparation after preview and confirmation.',
    inputSchema: {
      type: 'object',
      required: ['taskId', 'preparationId', 'capabilityName'],
      properties: {
        taskId: { type: 'integer' },
        preparationId: { oneOf: [{ type: 'integer' }, { type: 'string' }] },
        capabilityName: { type: 'string', enum: ['github.run_quality_checks'] }
      }
    },
    outputSchema: {
      type: 'object',
      properties: {
        action: { type: 'object' },
        automationRun: { type: 'object' },
        report: { type: 'object' }
      }
    }
  },
  {
    name: 'tasks.submit_evidence',
    domain: 'tasks',
    version: '1.0.0',
    scope: 'tasks:write',
    confirmationRequired: true,
    async: true,
    description: 'Freeze a task evidence bundle, queue submission validation, and bridge passing work to the existing peer/PM review loop.',
    inputSchema: {
      type: 'object',
      required: ['taskId', 'bundleId'],
      properties: {
        taskId: { type: 'integer' },
        bundleId: { oneOf: [{ type: 'integer' }, { type: 'string' }] },
        bundleUuid: { type: 'string', format: 'uuid' }
      }
    },
    outputSchema: {
      type: 'object',
      properties: {
        action: { type: 'object' },
        automationRun: { type: 'object' },
        validationResult: { type: 'object' }
      }
    }
  },
  {
    name: 'automation.create_github_issue',
    domain: 'automation',
    version: '0.1.0',
    scope: 'automation:write',
    confirmationRequired: true,
    description: 'Create GitHub issues through an auditable automation action. Reserved for GitHub integration rollout.',
    inputSchema: { type: 'object' },
    outputSchema: { type: 'object' }
  }
];

export const automationTemplates = [
  {
    key: 'competitor_research',
    name: 'Competitor Research',
    workerName: 'competitorResearchWorker',
    riskLevel: 'normal',
    status: 'planned'
  },
  {
    key: 'document_summary',
    name: 'Document Summary',
    workerName: 'documentSummaryWorker',
    riskLevel: 'normal',
    status: 'planned'
  },
  {
    key: 'project_plan_generation',
    name: 'Project Plan Generation',
    workerName: 'projectPlanWorker',
    riskLevel: 'normal',
    status: 'planned'
  },
  {
    key: 'github_issue_creation',
    name: 'GitHub Issue Creation',
    workerName: 'githubIssueWorker',
    riskLevel: 'high',
    status: 'planned'
  },
  {
    key: 'pull_request_generation',
    name: 'Pull Request Generation',
    workerName: 'pullRequestGenerationWorker',
    riskLevel: 'high',
    status: 'planned'
  },
  {
    key: 'pr_review',
    name: 'PR Review',
    workerName: 'prReviewWorker',
    riskLevel: 'normal',
    status: 'planned'
  },
  {
    key: 'run_quality_checks',
    name: 'Run Quality Checks',
    workerName: 'qualityChecksWorker',
    riskLevel: 'normal',
    status: 'available'
  },
  {
    key: 'deadline_monitoring',
    name: 'Deadline Monitoring',
    workerName: 'deadlineMonitoringWorker',
    riskLevel: 'normal',
    status: 'planned'
  },
  {
    key: 'blocker_detection',
    name: 'Blocker Detection',
    workerName: 'blockerDetectionWorker',
    riskLevel: 'normal',
    status: 'planned'
  },
  {
    key: 'reminders',
    name: 'Reminders',
    workerName: 'reminderWorker',
    riskLevel: 'normal',
    status: 'planned'
  },
  {
    key: 'submission_validation',
    name: 'Submission Validation',
    workerName: 'submissionValidationWorker',
    riskLevel: 'normal',
    status: 'available'
  },
  {
    key: 'staging_deploy_hooks',
    name: 'Staging Deploy Hooks',
    workerName: 'stagingDeployHookWorker',
    riskLevel: 'high',
    status: 'planned'
  },
  {
    key: 'staging_deployment',
    name: 'Staging Deployment',
    workerName: 'stagingDeploymentWorker',
    riskLevel: 'high',
    status: 'planned'
  }
];

class CapabilityRegistryService {
  listFunctions(scopes = []) {
    const scopeSet = new Set(scopes);
    return functionSchemas.map(fn => ({
      ...fn,
      available: !fn.scope || scopeSet.has(fn.scope)
    }));
  }

  listAutomationTemplates(scopes = []) {
    const canWriteAutomation = scopes.includes('automation:write');
    return automationTemplates.map(template => ({
      ...template,
      confirmationRequired: true,
      available: canWriteAutomation && template.status === 'available'
    }));
  }

  async listPrompts() {
    const result = await pool.query(
      `SELECT prompt_key, version, prompt_text, schema, status, created_at
       FROM api_prompt_registry
       WHERE status = 'active'
       ORDER BY prompt_key ASC, version DESC`
    );
    return result.rows;
  }

  findFunctionByName(name) {
    return functionSchemas.find(fn => fn.name === name);
  }

  findAutomationTemplate(key) {
    return automationTemplates.find(template => template.key === key);
  }
}

export default new CapabilityRegistryService();
