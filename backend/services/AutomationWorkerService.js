import crypto from 'crypto';
import fetch from 'node-fetch';
import pool from '../db.js';
import { sendNotification } from './NotificationService.js';
import { qualityCheckInputSchema, validatePreparationInputs } from './TaskAutomationInputValidator.js';
import TaskAutomationAuthorizationService from './TaskAutomationAuthorizationService.js';
import { resolveTaskAutomationCapability } from './TaskAutomationCapabilityResolver.js';
import { serializeTaskAutomation } from './TaskAutomationClassificationService.js';

const externalIntegrationTemplates = new Set([
  'github_issue_creation',
  'pull_request_generation',
  'pr_review',
  'staging_deploy_hooks',
  'staging_deployment'
]);
const AUTOMATION_LEASE_MS = Number(process.env.CERBANIMO_AUTOMATION_LEASE_MS || 5 * 60 * 1000);
const productionHostPattern = /(neon\.tech|amazonaws\.com|render\.com|onrender\.com|prod|production)/i;

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

  async claimRun(runId) {
    const claimToken = crypto.randomBytes(18).toString('base64url');
    const result = await pool.query(
      `UPDATE automation_runs
       SET status = 'running',
           attempt_count = COALESCE(attempt_count, 0) + 1,
           claim_token = $2,
           lease_expires_at = NOW() + ($3::int * INTERVAL '1 millisecond'),
           started_at = COALESCE(started_at, NOW())
       WHERE id::text = $1
         AND status IN ('queued', 'running')
         AND (status <> 'running' OR lease_expires_at IS NULL OR lease_expires_at <= NOW())
         AND cancelled_at IS NULL
       RETURNING *`,
      [String(runId), claimToken, AUTOMATION_LEASE_MS]
    );

    if (result.rows[0]) return { claimed: true, run: await this.getRun(result.rows[0].id), claimToken };
    return { claimed: false, run: await this.getRun(runId), claimToken: null };
  }

  async markCompleted(runId, result, claimToken) {
    const status = statusForResult(result);
    const update = await pool.query(
      `UPDATE automation_runs
       SET status = $2,
           result = $3::jsonb,
           completed_at = NOW(),
           lease_expires_at = NULL,
           claim_token = NULL
       WHERE id = $1
         AND ($4::text IS NULL OR claim_token = $4)
       RETURNING id`,
      [runId, status, JSON.stringify(result), claimToken || null]
    );
    if (claimToken && update.rowCount === 0) {
      throw new Error(`Automation run ${runId} claim was lost before completion.`);
    }
  }

  async assertClaimOwned(runId, claimToken, client = pool) {
    const result = await client.query(
      `SELECT id, status
       FROM automation_runs
       WHERE id = $1
         AND claim_token = $2
         AND status = 'running'
         AND cancelled_at IS NULL
         AND (lease_expires_at IS NULL OR lease_expires_at > NOW())`,
      [runId, claimToken]
    );
    if (result.rowCount !== 1) {
      const error = new Error(`Automation run ${runId} claim is no longer active.`);
      error.code = 'AUTOMATION_CLAIM_LOST';
      throw error;
    }
  }

  async renewLease(runId, claimToken) {
    const result = await pool.query(
      `UPDATE automation_runs
       SET lease_expires_at = NOW() + ($3::int * INTERVAL '1 millisecond'),
           updated_at = NOW()
       WHERE id = $1
         AND claim_token = $2
         AND status = 'running'
         AND cancelled_at IS NULL
       RETURNING id`,
      [runId, claimToken, AUTOMATION_LEASE_MS]
    );
    if (result.rowCount !== 1) {
      const error = new Error(`Automation run ${runId} claim could not be renewed.`);
      error.code = 'AUTOMATION_CLAIM_LOST';
      throw error;
    }
  }

  async markFailed(runId, error, claimToken = null) {
    await pool.query(
      `UPDATE automation_runs
       SET status = 'failed',
           result = $2::jsonb,
           completed_at = NOW(),
           lease_expires_at = NULL,
           claim_token = NULL
       WHERE id = $1
         AND ($3::text IS NULL OR claim_token = $3)`,
      [
        runId,
        JSON.stringify({ status: 'executor_failed', error: error.message || String(error), failedAt: nowIso() }),
        claimToken
      ]
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
    const claim = await this.claimRun(runId);
    if (!claim.run) throw new Error(`Automation run ${runId} not found`);
    if (!claim.claimed) {
      return claim.run.result || { status: claim.run.status, message: 'Automation run is already claimed or terminal.' };
    }

    const run = claim.run;
    await this.log(run.id, 'info', `Starting automation ${run.template_key}`, { input: redactRunInput(run.input || {}) });

    try {
      await this.assertClaimOwned(run.id, claim.claimToken);
      const result = await this.dispatch(run);
      await this.renewLease(run.id, claim.claimToken);
      await this.finalizeRunTransaction(run.id, result, claim.claimToken);
      await this.log(run.id, result.status === 'blocked' ? 'warn' : 'info', `Automation ${run.template_key} finished`, result);
      return result;
    } catch (error) {
      await this.markFailed(run.id, error, claim.claimToken);
      await this.log(run.id, 'error', `Automation ${run.template_key} failed`, { error: error.message || String(error) });
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
        shouldMarkActionExecuted(result),
        run.action_id
      ]
    );
  }

  async finalizeRunTransaction(runId, result, claimToken) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const run = (await client.query(
        `SELECT *
         FROM automation_runs
         WHERE id = $1
         FOR UPDATE`,
        [runId]
      )).rows[0];
      if (!run) {
        const error = new Error(`Automation run ${runId} not found.`);
        error.status = 404;
        throw error;
      }
      if (run.claim_token !== claimToken || run.status !== 'running' || run.cancelled_at) {
        const error = new Error(`Automation run ${runId} claim was lost before finalization.`);
        error.code = 'AUTOMATION_CLAIM_LOST';
        throw error;
      }

      const action = run.action_id
        ? (await client.query('SELECT * FROM api_actions WHERE id = $1 FOR UPDATE', [run.action_id])).rows[0]
        : null;
      const preparation = run.preparation_id
        ? (await client.query('SELECT * FROM task_automation_preparations WHERE id = $1 FOR UPDATE', [run.preparation_id])).rows[0]
        : null;
      const task = preparation
        ? (await client.query(
            `SELECT t.*, p.creator_id AS project_creator_id
             FROM tasks t
             LEFT JOIN projects p ON p.id = t.project_id
             WHERE t.id = $1
             FOR UPDATE OF t`,
            [preparation.task_id]
          )).rows[0]
        : null;

      if (run.template_key === 'run_quality_checks') {
        if (!preparation || !task) {
          const error = new Error('Task automation finalization requires a locked preparation and task.');
          error.status = 409;
          throw error;
        }
        const actorUserId = run.actor_user_id || preparation.actor_user_id;
        const validation = validatePreparationInputs(preparation.input_schema_snapshot || qualityCheckInputSchema(), preparation.input_values || {}, { actorUserId });
        const capability = resolveTaskAutomationCapability({
          task: { ...task, automation: serializeTaskAutomation(task) },
          preparation,
          scopes: ['automation:write'],
          validationResult: validation,
          actorUserId,
          taskAuthority: true
        });
        await TaskAutomationAuthorizationService.assert(task.id, { actorUserId, scopes: ['automation:write'] }, 'canSubmitAutomationResult', client);
        if (!validation.valid || !capability.executionAvailable) {
          result = {
            status: 'blocked',
            reason: 'FINALIZATION_REVALIDATION_FAILED',
            message: 'Task automation authorization or inputs changed before finalization.',
            validation,
            capability,
            completedAt: nowIso()
          };
        }

        await client.query(
          `INSERT INTO automation_run_reports (run_id, task_id, report_type, status, report, artifact_uri)
           VALUES ($1, $2, $3, $4, $5::jsonb, $6)
           ON CONFLICT (run_id, report_type)
           DO UPDATE SET status = EXCLUDED.status,
                         report = EXCLUDED.report,
                         artifact_uri = EXCLUDED.artifact_uri,
                         updated_at = NOW()`,
          [
            run.id,
            task.id,
            result.reportType || 'quality_check',
            result.status || 'completed',
            JSON.stringify(result),
            result.artifactUri || null
          ]
        );

        if (result.status === 'checks_passed') {
          const proofUri = result.artifactUri || `cerbanimo://automation-runs/${run.run_uuid || run.id}/quality-check-report`;
          await client.query(
            `INSERT INTO task_automation_submissions (run_id, task_id, submitted_by, proof_uri, report)
             VALUES ($1, $2, $3, $4, $5::jsonb)
             ON CONFLICT (run_id) DO NOTHING`,
            [run.id, task.id, actorUserId || null, proofUri, JSON.stringify(result)]
          );
          await client.query(
            `UPDATE tasks
             SET submitted = TRUE,
                 submitted_at = COALESCE(submitted_at, NOW()),
                 status = 'submitted',
                 peer_review_deadline = COALESCE(peer_review_deadline, NOW() + INTERVAL '6 hours'),
                 proof_of_work_links = CASE
                   WHEN $2 = ANY(COALESCE(proof_of_work_links, '{}'::text[])) THEN proof_of_work_links
                   ELSE array_append(COALESCE(proof_of_work_links, '{}'::text[]), $2)
                 END,
                 reflection = COALESCE(NULLIF(reflection, ''), $3),
                 submitted_by = COALESCE(submitted_by, $4)
             WHERE id = $1`,
            [
              task.id,
              proofUri,
              `Automated quality-check report from run ${run.run_uuid || run.id}: ${result.summary || 'Quality checks passed.'}`,
              actorUserId || null
            ]
          );
          await client.query(
            `INSERT INTO automation_logs (run_id, level, message, payload)
             VALUES ($1, 'info', 'Task submitted from passing quality-check report.', $2::jsonb)`,
            [run.id, JSON.stringify({ taskId: task.id, proofUri, status: 'submitted' })]
          );
          result = { ...result, submittedTask: true };
        }
      }

      const finalStatus = statusForResult(result);
      await client.query(
        `UPDATE automation_runs
         SET status = $2,
             result = $3::jsonb,
             completed_at = NOW(),
             lease_expires_at = NULL,
             claim_token = NULL,
             updated_at = NOW()
         WHERE id = $1`,
        [run.id, finalStatus, JSON.stringify(result)]
      );
      if (action) {
        await client.query(
          `UPDATE api_actions
           SET execution_result = $1::jsonb,
               notifications_emitted = COALESCE($2::jsonb, notifications_emitted),
               executed_at = CASE WHEN $3 THEN NOW() ELSE executed_at END,
               status = CASE WHEN $3 THEN 'executed' WHEN $4 IN ('blocked', 'failed') THEN 'failed' ELSE status END
           WHERE id = $5`,
          [
            JSON.stringify(result),
            JSON.stringify(result.notificationsEmitted || []),
            shouldMarkActionExecuted(result),
            finalStatus,
            action.id
          ]
        );
      }

      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async runQualityChecks(run) {
    const input = run.input || {};
    if (input.preparationId || input.preparation_id) {
      return this.runPreparedQualityChecks(run);
    }

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

  async runPreparedQualityChecks(run) {
    const context = await this.loadQualityCheckPreparation(run);
    if (context.blocked) return context.blocked;

    const { task, preparation, values } = context;
    const executor = resolveQualityCheckExecutor();
    if (!executor.available) {
      return {
        status: 'blocked',
        reason: executor.reason,
        taskId: task.id,
        preparationId: preparation.id,
        message: executor.message,
        completedAt: nowIso()
      };
    }

    const forcedResult = process.env.CERBANIMO_QUALITY_CHECK_E2E_RESULT;
    const failed = forcedResult === 'checks_failed';
    const checks = [
      { key: 'repository_access', status: 'passed', message: `Repository ${values.repository} accepted by deterministic executor.` },
      { key: 'dependency_install', status: failed ? 'failed' : 'passed', message: failed ? 'Dependency installation failed in deterministic scenario.' : 'Dependencies installed.' },
      { key: 'typecheck', status: failed ? 'skipped' : 'passed', message: failed ? 'Skipped after dependency failure.' : 'Type check passed.' },
      { key: 'lint', status: failed ? 'skipped' : 'passed', message: failed ? 'Skipped after dependency failure.' : 'Lint passed.' },
      { key: 'unit_tests', status: failed ? 'skipped' : 'passed', message: failed ? 'Skipped after dependency failure.' : 'Unit tests passed.' },
      { key: 'build', status: failed ? 'skipped' : 'passed', message: failed ? 'Skipped after dependency failure.' : 'Build passed.' }
    ];
    const status = failed ? 'checks_failed' : 'checks_passed';
    const report = {
      status,
      reportType: 'quality_check',
      taskId: task.id,
      taskName: task.name,
      preparationId: preparation.id,
      repository: values.repository,
      ref: values.ref,
      checkProfile: values.checkProfile,
      executor: executor.name,
      checks,
      summary: failed
        ? 'Quality checks completed with failures. The task was not submitted.'
        : 'Quality checks passed. Cerbanimo attached this report and submitted the task for review.',
      artifactUri: `cerbanimo://automation-runs/${run.run_uuid || run.id}/quality-check-report`,
      submittedTask: false,
      completedAt: nowIso()
    };

    return report;
  }

  async loadQualityCheckPreparation(run) {
    const input = run.input || {};
    const preparationId = input.preparationId || input.preparation_id || run.preparation_id;
    const result = await pool.query(
      `SELECT p.*,
              t.id AS task_id,
              t.name AS task_name,
              t.status AS task_status,
              t.project_id,
              t.automation_classification,
              t.automation_requirements,
              t.required_human_inputs,
              t.validation_requirements
       FROM task_automation_preparations p
       JOIN tasks t ON t.id = p.task_id
       WHERE p.id::text = $1 OR p.preparation_uuid::text = $1
       LIMIT 1`,
      [String(preparationId)]
    );
    const row = result.rows[0];
    if (!row) {
      return {
        blocked: {
          status: 'blocked',
          reason: 'PREPARATION_NOT_FOUND',
          message: 'Quality-check preparation was not found.',
          completedAt: nowIso()
        }
      };
    }

    const validation = validatePreparationInputs(row.input_schema_snapshot || qualityCheckInputSchema(), row.input_values || {}, { actorUserId: row.actor_user_id });
    if (!validation.valid) {
      return {
        blocked: {
          status: 'blocked',
          reason: 'INPUTS_INCOMPLETE',
          message: 'Prepared quality-check inputs are incomplete.',
          validation,
          completedAt: nowIso()
        }
      };
    }

    return {
      preparation: row,
      task: {
        id: row.task_id,
        name: row.task_name,
        status: row.task_status,
        project_id: row.project_id
      },
      values: validation.sanitizedValues
    };
  }

  async submitTaskFromQualityReport(task, run, report) {
    const proofUri = report.artifactUri;
    await pool.query(
      `UPDATE tasks
       SET submitted = TRUE,
           submitted_at = NOW(),
           status = 'submitted',
           peer_review_deadline = NOW() + INTERVAL '6 hours',
           proof_of_work_links = CASE
             WHEN $2 = ANY(COALESCE(proof_of_work_links, '{}'::text[])) THEN proof_of_work_links
             ELSE array_append(COALESCE(proof_of_work_links, '{}'::text[]), $2)
           END,
           reflection = COALESCE(NULLIF(reflection, ''), $3),
           submitted_by = COALESCE(submitted_by, $4)
       WHERE id = $1`,
      [
        task.id,
        proofUri,
        `Automated quality-check report from run ${run.run_uuid || run.id}: ${report.summary}`,
        run.actor_user_id || null
      ]
    );
    await this.log(run.id, 'info', 'Task submitted from passing quality-check report.', {
      taskId: task.id,
      proofUri,
      status: 'submitted'
    });
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

function statusForResult(result = {}) {
  if (result.status === 'blocked') return 'blocked';
  if (result.status === 'cancelled') return 'cancelled';
  if (result.status === 'executor_failed') return 'failed';
  return 'completed';
}

function shouldMarkActionExecuted(result = {}) {
  return ['completed', 'checks_passed', 'checks_failed'].includes(result.status);
}

function redactRunInput(input = {}) {
  const copy = { ...input };
  for (const key of Object.keys(copy)) {
    if (/secret|token|password|credential/i.test(key)) copy[key] = '[redacted]';
  }
  return copy;
}

function resolveQualityCheckExecutor() {
  const mode = process.env.CERBANIMO_QUALITY_CHECK_EXECUTOR || '';
  if (mode === 'deterministic') {
    return deterministicExecutorAllowed()
      ? { available: true, name: 'deterministic' }
      : {
          available: false,
          reason: 'PRODUCTION_SANDBOX_REQUIRED',
          message: 'Deterministic quality checks are only available in protected E2E test mode.'
        };
  }
  if (mode === 'local_trusted_workspace') {
    return {
      available: false,
      reason: 'EXECUTOR_NOT_CONFIGURED',
      message: 'The local trusted workspace quality-check executor has not been configured for production use.'
    };
  }
  return {
    available: false,
    reason: 'PRODUCTION_SANDBOX_REQUIRED',
    message: 'Quality checks require an explicitly configured sandbox executor.'
  };
}

function deterministicExecutorAllowed() {
  const databaseUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL || '';
  const parsed = parseDatabaseUrl(databaseUrl);
  const target = `${parsed.host || ''}/${parsed.database || ''}`.toLowerCase();
  return process.env.NODE_ENV === 'test'
    && process.env.CERBANIMO_E2E_MODE === 'true'
    && /(e2e|test)/i.test(parsed.database || '')
    && !productionHostPattern.test(target);
}

function parseDatabaseUrl(value) {
  try {
    const url = new URL(value);
    return {
      host: url.hostname,
      database: url.pathname.replace(/^\/+/, '')
    };
  } catch {
    return { host: '', database: '' };
  }
}

export default new AutomationWorkerService();
