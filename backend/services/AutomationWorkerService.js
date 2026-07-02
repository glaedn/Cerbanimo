import fetch from 'node-fetch';
import pool from '../db.js';
import { sendNotification } from './NotificationService.js';

const externalIntegrationTemplates = new Set([
  'github_issue_creation',
  'pull_request_generation',
  'pr_review',
  'staging_deploy_hooks',
  'staging_deployment'
]);

function nowIso() {
  return new Date().toISOString();
}

function compactText(text = '', maxLength = 1200) {
  return String(text).replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function splitSentences(text = '') {
  return String(text)
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map(sentence => sentence.trim())
    .filter(Boolean);
}

function summarizeText(text = '', maxSentences = 5) {
  const sentences = splitSentences(text);
  if (sentences.length === 0) return '';
  return sentences.slice(0, maxSentences).join(' ');
}

async function tableExists(tableName) {
  const result = await pool.query(
    `SELECT EXISTS (
       SELECT 1
       FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = $1
     ) AS exists`,
    [tableName]
  );
  return Boolean(result.rows[0]?.exists);
}

class AutomationWorkerService {
  async log(runId, level, message, payload = {}) {
    await pool.query(
      `INSERT INTO automation_logs (run_id, level, message, payload)
       VALUES ($1, $2, $3, $4::jsonb)`,
      [runId, level, message, JSON.stringify(payload)]
    );
  }

  async markRunning(runId) {
    await pool.query(
      `UPDATE automation_runs
       SET status = 'running', started_at = COALESCE(started_at, NOW())
       WHERE id = $1`,
      [runId]
    );
  }

  async markCompleted(runId, result) {
    await pool.query(
      `UPDATE automation_runs
       SET status = $2, result = $3::jsonb, completed_at = NOW()
       WHERE id = $1`,
      [runId, result.status === 'blocked' ? 'blocked' : 'completed', JSON.stringify(result)]
    );
  }

  async markFailed(runId, error) {
    await pool.query(
      `UPDATE automation_runs
       SET status = 'failed', result = $2::jsonb, completed_at = NOW()
       WHERE id = $1`,
      [runId, JSON.stringify({ status: 'failed', error: error.message || String(error), failedAt: nowIso() })]
    );
  }

  async getRun(runId) {
    const result = await pool.query(
      `SELECT r.*, a.intent_json, a.preview_payload
       FROM automation_runs r
       LEFT JOIN api_actions a ON a.id = r.action_id
       WHERE r.id = $1`,
      [runId]
    );
    return result.rows[0];
  }

  async run(runId) {
    const run = await this.getRun(runId);
    if (!run) throw new Error(`Automation run ${runId} not found`);

    await this.markRunning(runId);
    await this.log(runId, 'info', `Starting automation ${run.template_key}`, { input: run.input || {} });

    try {
      const result = await this.dispatch(run);
      await this.markCompleted(runId, result);
      await this.log(runId, result.status === 'blocked' ? 'warn' : 'info', `Automation ${run.template_key} finished`, result);
      await this.updateActionAfterRun(run, result);
      return result;
    } catch (error) {
      await this.markFailed(runId, error);
      await this.log(runId, 'error', `Automation ${run.template_key} failed`, { error: error.message || String(error) });
      throw error;
    }
  }

  async dispatch(run) {
    if (externalIntegrationTemplates.has(run.template_key)) {
      return this.externalIntegrationBlocked(run);
    }

    switch (run.template_key) {
      case 'run_quality_checks':
        return this.runQualityChecks(run);
      case 'submission_validation':
        return this.runSubmissionValidation(run);
      case 'deadline_monitoring':
        return this.runDeadlineMonitoring(run);
      case 'blocker_detection':
        return this.runBlockerDetection(run);
      case 'reminders':
        return this.runReminders(run);
      case 'document_summary':
        return this.runDocumentSummary(run);
      case 'project_plan_generation':
        return this.runProjectPlanGeneration(run);
      case 'competitor_research':
        return this.runCompetitorResearch(run);
      default:
        return {
          status: 'blocked',
          reason: 'unknown_template',
          message: `No worker implementation exists for ${run.template_key}.`,
          completedAt: nowIso()
        };
    }
  }

  async updateActionAfterRun(run, result) {
    if (!run.action_id) return;
    await pool.query(
      `UPDATE api_actions
       SET execution_result = $1::jsonb,
           notifications_emitted = COALESCE($2::jsonb, notifications_emitted),
           executed_at = CASE WHEN $3 THEN NOW() ELSE executed_at END,
           status = CASE WHEN $3 THEN 'executed' ELSE status END
       WHERE id = $4`,
      [
        JSON.stringify(result),
        JSON.stringify(result.notificationsEmitted || []),
        result.status !== 'blocked',
        run.action_id
      ]
    );
  }

  async runQualityChecks(run) {
    const input = run.input || {};
    const targetType = input.targetType || (input.projectId ? 'project' : 'task');
    const targetId = input.targetId || input.projectId || input.taskId;
    const checks = [];
    const findings = [];

    if (targetType === 'project') {
      const projectResult = await pool.query('SELECT * FROM projects WHERE id = $1', [targetId]);
      const project = projectResult.rows[0];
      checks.push({ key: 'project_exists', ok: Boolean(project), message: project ? 'Project found.' : 'Project not found.' });
      if (!project) return { status: 'completed', targetType, targetId, passed: false, checks, findings };

      const tasksResult = await pool.query(
        `SELECT id, name, description, status, due_date, dependencies, assigned_user_ids
         FROM tasks WHERE project_id = $1 ORDER BY id ASC`,
        [targetId]
      );
      const tasks = tasksResult.rows;
      checks.push({ key: 'has_tasks', ok: tasks.length > 0, message: `${tasks.length} tasks found.` });
      checks.push({ key: 'has_description', ok: Boolean(project.description), message: project.description ? 'Project description exists.' : 'Project description is missing.' });

      const blockedTasks = tasks.filter(task => task.status?.includes('inactive') && task.dependencies?.length);
      const overdueTasks = tasks.filter(task => task.due_date && new Date(task.due_date) < new Date() && !String(task.status).startsWith('completed'));
      if (blockedTasks.length > 0) findings.push({ severity: 'medium', type: 'blocked_tasks', count: blockedTasks.length, taskIds: blockedTasks.map(task => task.id) });
      if (overdueTasks.length > 0) findings.push({ severity: 'high', type: 'overdue_tasks', count: overdueTasks.length, taskIds: overdueTasks.map(task => task.id) });

      return {
        status: 'completed',
        targetType,
        targetId,
        passed: checks.every(check => check.ok) && overdueTasks.length === 0,
        checks,
        findings,
        stats: {
          taskCount: tasks.length,
          completedCount: tasks.filter(task => String(task.status).startsWith('completed')).length,
          overdueCount: overdueTasks.length,
          blockedCount: blockedTasks.length
        },
        completedAt: nowIso()
      };
    }

    return this.runSubmissionValidation({ ...run, input: { ...input, taskId: targetId } });
  }

  async runSubmissionValidation(run) {
    const input = run.input || {};
    const taskId = input.taskId || input.targetId;
    const taskResult = await pool.query(
      `SELECT id, name, status, submitted, proof_of_work_links, reflection, submitted_by, submitted_at
       FROM tasks WHERE id = $1`,
      [taskId]
    );
    const task = taskResult.rows[0];
    const checks = [
      { key: 'task_exists', ok: Boolean(task), message: task ? 'Task found.' : 'Task not found.' },
      { key: 'submitted', ok: Boolean(task?.submitted), message: task?.submitted ? 'Task is submitted.' : 'Task is not submitted.' },
      { key: 'proof_of_work', ok: Boolean(task?.proof_of_work_links?.length), message: task?.proof_of_work_links?.length ? 'Proof of work is attached.' : 'Proof of work is missing.' },
      { key: 'reflection', ok: Boolean(task?.reflection), message: task?.reflection ? 'Reflection is present.' : 'Reflection is missing.' }
    ];

    return {
      status: 'completed',
      targetType: 'task',
      targetId: taskId,
      passed: checks.every(check => check.ok),
      checks,
      target: task || null,
      completedAt: nowIso()
    };
  }

  async runDeadlineMonitoring(run) {
    const input = run.input || {};
    const values = [];
    const filters = ["due_date IS NOT NULL", "status::text NOT LIKE 'completed%'"];
    if (input.projectId) {
      values.push(input.projectId);
      filters.push(`project_id = $${values.length}`);
    }
    if (input.userId) {
      values.push(input.userId);
      filters.push(`$${values.length} = ANY(assigned_user_ids)`);
    }

    const result = await pool.query(
      `SELECT id, name, project_id, status, due_date, assigned_user_ids
       FROM tasks
       WHERE ${filters.join(' AND ')}
       ORDER BY due_date ASC
       LIMIT 50`,
      values
    );

    const now = new Date();
    const tasks = result.rows.map(task => {
      const due = new Date(task.due_date);
      const hoursRemaining = Math.round((due - now) / (1000 * 60 * 60));
      return {
        ...task,
        hoursRemaining,
        deadlineState: hoursRemaining < 0 ? 'overdue' : hoursRemaining <= 24 ? 'due_soon' : 'scheduled'
      };
    });

    return {
      status: 'completed',
      targetType: input.projectId ? 'project' : 'tasks',
      targetId: input.projectId || null,
      overdue: tasks.filter(task => task.deadlineState === 'overdue'),
      dueSoon: tasks.filter(task => task.deadlineState === 'due_soon'),
      scheduledCount: tasks.filter(task => task.deadlineState === 'scheduled').length,
      completedAt: nowIso()
    };
  }

  async runBlockerDetection(run) {
    const input = run.input || {};
    const values = [];
    const filters = ["t.status::text NOT LIKE 'completed%'"];
    if (input.projectId) {
      values.push(input.projectId);
      filters.push(`t.project_id = $${values.length}`);
    }

    const result = await pool.query(
      `SELECT t.id, t.name, t.project_id, t.status, t.dependencies, t.due_date,
              COALESCE(json_agg(json_build_object('id', dep.id, 'name', dep.name, 'status', dep.status))
                FILTER (WHERE dep.id IS NOT NULL), '[]') AS dependency_statuses
       FROM tasks t
       LEFT JOIN tasks dep ON dep.id = ANY(t.dependencies)
       WHERE ${filters.join(' AND ')}
       GROUP BY t.id
       ORDER BY t.id ASC
       LIMIT 100`,
      values
    );

    const blocked = result.rows.filter(task => {
      const deps = task.dependency_statuses || [];
      return deps.some(dep => !String(dep.status).startsWith('completed'));
    });

    return {
      status: 'completed',
      targetType: input.projectId ? 'project' : 'tasks',
      targetId: input.projectId || null,
      blockerCount: blocked.length,
      blockers: blocked.map(task => ({
        taskId: task.id,
        taskName: task.name,
        projectId: task.project_id,
        status: task.status,
        unresolvedDependencies: (task.dependency_statuses || []).filter(dep => !String(dep.status).startsWith('completed'))
      })),
      completedAt: nowIso()
    };
  }

  async runReminders(run) {
    const input = run.input || {};
    const dueWithinHours = Number(input.dueWithinHours || 24);
    const notificationsEmitted = [];
    const values = [dueWithinHours];
    const filters = [
      "due_date IS NOT NULL",
      "due_date <= NOW() + ($1::int || ' hours')::interval",
      "status::text NOT LIKE 'completed%'"
    ];
    if (input.projectId) {
      values.push(input.projectId);
      filters.push(`project_id = $${values.length}`);
    }

    const result = await pool.query(
      `SELECT id, name, project_id, assigned_user_ids, due_date
       FROM tasks
       WHERE ${filters.join(' AND ')}
       LIMIT 50`,
      values
    );

    for (const task of result.rows) {
      for (const userId of task.assigned_user_ids || []) {
        const notification = await sendNotification(userId, {
          taskId: task.id,
          type: 'deadline_reminder',
          message: JSON.stringify({
            text: `Reminder: ${task.name} is due soon.`,
            taskId: task.id,
            projectId: task.project_id,
            dueDate: task.due_date
          })
        });
        if (notification) notificationsEmitted.push(notification);
      }
    }

    return {
      status: 'completed',
      tasksConsidered: result.rows.length,
      notificationsEmitted,
      completedAt: nowIso()
    };
  }

  async runDocumentSummary(run) {
    const input = run.input || {};
    const text = input.text || input.documentText || '';
    if (!text && !input.url) {
      return {
        status: 'blocked',
        reason: 'missing_document_text',
        message: 'Provide text, documentText, or a retrievable URL for summarization.',
        completedAt: nowIso()
      };
    }

    let sourceText = text;
    let sourceCapture = null;
    if (!sourceText && input.url) {
      sourceCapture = await this.captureSource(input.url);
      sourceText = sourceCapture.text || '';
    }

    const summary = summarizeText(sourceText, Number(input.maxSentences || 5));
    return {
      status: 'completed',
      summary,
      wordCount: sourceText.split(/\s+/).filter(Boolean).length,
      source: sourceCapture || { type: 'inline_text' },
      cards: [
        { type: 'document_summary', title: input.title || 'Document Summary', body: summary }
      ],
      completedAt: nowIso()
    };
  }

  async runProjectPlanGeneration(run) {
    const input = run.input || {};
    let project = null;
    if (input.projectId) {
      const result = await pool.query('SELECT * FROM projects WHERE id = $1', [input.projectId]);
      project = result.rows[0] || null;
    }

    const title = input.name || project?.name || 'Untitled project';
    const description = input.description || project?.description || '';
    const tags = input.tags || project?.tags || [];
    const plan = {
      title,
      summary: compactText(description || `Implementation plan for ${title}`, 500),
      phases: [
        { name: 'Define outcome', tasks: ['Confirm success criteria', 'Identify stakeholders', 'Set deadline'] },
        { name: 'Prepare work', tasks: ['Break work into implementation tasks', 'Assign required skills', 'Resolve dependencies'] },
        { name: 'Execute and validate', tasks: ['Run quality checks', 'Collect submission evidence', 'Review and approve work'] }
      ],
      suggestedTasks: [
        { name: `Clarify ${title} outcome`, description: 'Write the final outcome statement and acceptance criteria.', skillName: 'Project Planning' },
        { name: `Create implementation backlog for ${title}`, description: 'Turn the plan into ordered, dependency-aware tasks.', skillName: 'Project Management' },
        { name: `Validate ${title} delivery`, description: 'Run quality checks and collect review evidence.', skillName: 'Quality Assurance' }
      ],
      tags
    };

    if (input.persistToProject && project?.id) {
      await pool.query('UPDATE projects SET project_plan = $1 WHERE id = $2', [JSON.stringify(plan), project.id]);
    }

    return {
      status: 'completed',
      projectId: project?.id || null,
      plan,
      persisted: Boolean(input.persistToProject && project?.id),
      completedAt: nowIso()
    };
  }

  async runCompetitorResearch(run) {
    const input = run.input || {};
    const competitors = Array.isArray(input.competitors) ? input.competitors : [];
    const sources = Array.isArray(input.sources) ? input.sources : [];
    const captures = [];

    for (const source of sources.slice(0, 8)) {
      try {
        captures.push(await this.captureSource(typeof source === 'string' ? source : source.url));
      } catch (error) {
        captures.push({ url: typeof source === 'string' ? source : source.url, ok: false, error: error.message });
      }
    }

    const competitorCards = competitors.map(competitor => ({
      name: typeof competitor === 'string' ? competitor : competitor.name,
      positioning: typeof competitor === 'object' ? competitor.positioning || null : null,
      notes: typeof competitor === 'object' ? competitor.notes || [] : []
    }));

    return {
      status: 'completed',
      topic: input.topic || null,
      competitors: competitorCards,
      sources: captures,
      findings: [
        { type: 'source_capture', count: captures.filter(capture => capture.ok).length },
        { type: 'competitor_count', count: competitorCards.length }
      ],
      completedAt: nowIso()
    };
  }

  async captureSource(url) {
    if (!url) return { ok: false, error: 'Missing URL' };
    const response = await fetch(url, { timeout: 8000 });
    const text = await response.text();
    const title = text.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() || url;
    const bodyText = compactText(text.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' '), 2000);
    return {
      ok: response.ok,
      url,
      statusCode: response.status,
      title,
      text: bodyText,
      capturedAt: nowIso()
    };
  }

  externalIntegrationBlocked(run) {
    const configHints = {
      github_issue_creation: ['GITHUB_TOKEN', 'GITHUB_REPOSITORY'],
      pull_request_generation: ['GITHUB_TOKEN', 'GITHUB_REPOSITORY', 'repository working branch policy'],
      pr_review: ['GITHUB_TOKEN', 'GITHUB_REPOSITORY or pullRequestUrl'],
      staging_deploy_hooks: ['RENDER_API_KEY or deployment webhook URL'],
      staging_deployment: ['RENDER_API_KEY or deployment webhook URL']
    };

    return {
      status: 'blocked',
      reason: 'external_integration_not_configured',
      templateKey: run.template_key,
      message: `${run.template_key} requires external credentials and target repository/deployment configuration before Cerbanimo can execute it safely.`,
      requiredConfiguration: configHints[run.template_key] || [],
      input: run.input || {},
      completedAt: nowIso()
    };
  }
}

export default new AutomationWorkerService();
