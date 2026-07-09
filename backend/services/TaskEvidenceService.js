import crypto from 'crypto';
import pool from '../db.js';
import CapabilityRegistryService from './CapabilityRegistryService.js';
import TaskAccessService from './TaskAccessService.js';
import TaskEvidenceRequirementService from './TaskEvidenceRequirementService.js';
import EvidenceArtifactStore from './EvidenceArtifactStore.js';
import EvidenceFetchService from './EvidenceFetchService.js';
import EvidenceValidationProvider from './EvidenceValidationProvider.js';

const draftStatuses = new Set(['draft']);
const previewableStatuses = new Set(['draft', 'previewed']);
const terminalBundleStatuses = new Set(['validation_passed', 'validation_failed', 'cancelled', 'superseded']);

function nowIso() {
  return new Date().toISOString();
}

function compactText(value = '', maxLength = 8000) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function jsonHash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value ?? null)).digest('hex');
}

function parseJsonish(value, fallback) {
  if (Array.isArray(value) || (value && typeof value === 'object')) return value;
  if (typeof value !== 'string') return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizeStatus(status) {
  if (status === 'passed') return 'validation_passed';
  if (status === 'failed') return 'validation_failed';
  return status;
}

function actionIdFromBundle(bundle) {
  return bundle?.action_id ? String(bundle.action_id) : null;
}

function validateBundleStatus(bundle, allowedStatuses) {
  if (!allowedStatuses.has(bundle.status)) {
    const error = new Error(`Evidence bundle cannot be modified from status ${bundle.status}.`);
    error.status = terminalBundleStatuses.has(bundle.status) ? 409 : 400;
    error.code = 'EVIDENCE_BUNDLE_STATUS_LOCKED';
    throw error;
  }
}

function buildAuthoritySnapshot({ actorUserId, isServiceActor = false, scopes = [], roles = [] } = {}) {
  return {
    actorUserId: actorUserId || null,
    isServiceActor: Boolean(isServiceActor),
    scopes: asArray(scopes),
    roles: asArray(roles),
    capturedAt: nowIso()
  };
}

class TaskEvidenceService {
  async listEvidence({ taskId, authContext }) {
    const task = await TaskAccessService.loadTask(taskId);
    if (!task) return null;
    await TaskAccessService.assert(task.id, authContext, 'canViewEvidence');
    const [bundles, items, validations] = await Promise.all([
      pool.query(
        `SELECT *
         FROM task_evidence_bundles
         WHERE task_id = $1
         ORDER BY updated_at DESC, id DESC
         LIMIT 25`,
        [task.id]
      ),
      pool.query(
        `SELECT i.*
         FROM task_evidence_items i
         JOIN task_evidence_bundles b ON b.id = i.bundle_id
         WHERE b.task_id = $1
         ORDER BY i.created_at ASC`,
        [task.id]
      ),
      pool.query(
        `SELECT *
         FROM task_validation_results
         WHERE task_id = $1
         ORDER BY created_at DESC
         LIMIT 10`,
        [task.id]
      )
    ]);
    const itemsByBundle = new Map();
    for (const item of items.rows) {
      const key = String(item.bundle_id);
      itemsByBundle.set(key, [...(itemsByBundle.get(key) || []), this.serializeItem(item)]);
    }
    return {
      task,
      requirements: TaskEvidenceRequirementService.summarize(TaskEvidenceRequirementService.normalizeForTask(task)),
      bundles: bundles.rows.map(bundle => this.serializeBundle(bundle, itemsByBundle.get(String(bundle.id)) || [])),
      validations: validations.rows
    };
  }

  async createBundle({ taskId, actorUserId, authContext, sourceKind = 'human', reflection = '', summary = '' }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const task = await TaskAccessService.loadTask(taskId, client);
      if (!task) {
        const error = new Error('Task not found');
        error.status = 404;
        throw error;
      }
      await TaskAccessService.assert(task.id, authContext, 'canSubmitEvidence', client);
      const existing = await this.findActiveDraft(client, task.id, actorUserId);
      if (existing) {
        await client.query('COMMIT');
        return this.hydrateBundle(existing.id, authContext);
      }
      const versionResult = await client.query(
        `SELECT COALESCE(MAX(version), 0)::int + 1 AS next_version
         FROM task_evidence_bundles
         WHERE task_id = $1
           AND (($2::int IS NULL AND actor_user_id IS NULL) OR actor_user_id = $2)`,
        [task.id, actorUserId || null]
      );
      const result = await client.query(
        `INSERT INTO task_evidence_bundles (
           task_id, actor_user_id, source_kind, status, version, reflection, summary
         )
         VALUES ($1, $2, $3, 'draft', $4, $5, $6)
         RETURNING *`,
        [
          task.id,
          actorUserId || null,
          sourceKind || 'human',
          versionResult.rows[0]?.next_version || 1,
          compactText(reflection, 8000) || null,
          compactText(summary, 1200) || null
        ]
      );
      await client.query('COMMIT');
      return this.hydrateBundle(result.rows[0].id, authContext);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getBundle({ taskId, bundleId, authContext }) {
    const bundle = await this.findBundle(bundleId, taskId);
    if (!bundle) return null;
    await TaskAccessService.assert(bundle.task_id, authContext, 'canViewEvidence');
    return this.hydrateBundle(bundle.id, authContext);
  }

  async updateBundle({ taskId, bundleId, authContext, reflection, summary, sourceKind }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const bundle = await this.findBundleForUpdate(client, bundleId, taskId);
      if (!bundle) {
        const error = new Error('Evidence bundle not found');
        error.status = 404;
        throw error;
      }
      validateBundleStatus(bundle, draftStatuses);
      await TaskAccessService.assert(bundle.task_id, authContext, 'canSubmitEvidence', client);
      const result = await client.query(
        `UPDATE task_evidence_bundles
         SET reflection = COALESCE($2, reflection),
             summary = COALESCE($3, summary),
             source_kind = COALESCE($4, source_kind),
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [
          bundle.id,
          reflection === undefined ? null : compactText(reflection, 8000),
          summary === undefined ? null : compactText(summary, 1200),
          sourceKind || null
        ]
      );
      await client.query('COMMIT');
      return this.hydrateBundle(result.rows[0].id, authContext);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async addItem({ taskId, bundleId, authContext, item }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const bundle = await this.findBundleForUpdate(client, bundleId, taskId);
      if (!bundle) {
        const error = new Error('Evidence bundle not found');
        error.status = 404;
        throw error;
      }
      validateBundleStatus(bundle, draftStatuses);
      await TaskAccessService.assert(bundle.task_id, authContext, 'canSubmitEvidence', client);
      const task = await TaskAccessService.loadTask(bundle.task_id, client);
      const requirements = TaskEvidenceRequirementService.normalizeForTask(task);
      const created = await this.createItemWithClient(client, bundle, item, requirements);
      await client.query(
        `UPDATE task_evidence_bundles
         SET updated_at = NOW()
         WHERE id = $1`,
        [bundle.id]
      );
      await client.query('COMMIT');
      return this.hydrateBundle(bundle.id, authContext, { createdItemId: created.id });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteItem({ taskId, bundleId, itemId, authContext }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const bundle = await this.findBundleForUpdate(client, bundleId, taskId);
      if (!bundle) {
        const error = new Error('Evidence bundle not found');
        error.status = 404;
        throw error;
      }
      validateBundleStatus(bundle, draftStatuses);
      await TaskAccessService.assert(bundle.task_id, authContext, 'canSubmitEvidence', client);
      await client.query(
        `DELETE FROM task_evidence_items
         WHERE bundle_id = $1
           AND (id::text = $2 OR evidence_uuid::text = $2)`,
        [bundle.id, String(itemId)]
      );
      await client.query('UPDATE task_evidence_bundles SET updated_at = NOW() WHERE id = $1', [bundle.id]);
      await client.query('COMMIT');
      return this.hydrateBundle(bundle.id, authContext);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async fetchUrl({ taskId, bundleId, authContext, url, requirementIds = [], title }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const bundle = await this.findBundleForUpdate(client, bundleId, taskId);
      if (!bundle) {
        const error = new Error('Evidence bundle not found');
        error.status = 404;
        throw error;
      }
      validateBundleStatus(bundle, draftStatuses);
      await TaskAccessService.assert(bundle.task_id, authContext, 'canSubmitEvidence', client);
      const snapshot = await EvidenceFetchService.fetchSnapshot(url, { client });
      await EvidenceArtifactStore.assertBundleSize(bundle.id, snapshot.byteSize, client);
      const item = await this.createItemWithClient(client, bundle, {
        evidenceType: 'url_snapshot',
        title: title || `Snapshot of ${snapshot.canonicalUrl}`,
        sourceUrl: snapshot.sourceUrl,
        canonicalUrl: snapshot.canonicalUrl,
        requirementIds,
        blobStorageKey: snapshot.blobStorageKey,
        mediaType: snapshot.mediaType,
        byteSize: snapshot.byteSize,
        contentSha256: snapshot.contentSha256,
        metadata: {
          statusCode: snapshot.statusCode,
          capturedAt: nowIso()
        }
      }, TaskEvidenceRequirementService.normalizeForTask(await TaskAccessService.loadTask(bundle.task_id, client)));
      await client.query('UPDATE task_evidence_bundles SET updated_at = NOW() WHERE id = $1', [bundle.id]);
      await client.query('COMMIT');
      return this.hydrateBundle(bundle.id, authContext, { createdItemId: item.id });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async previewBundle({ taskId, bundleId, authContext, sourceClient = 'api' }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const bundle = await this.findBundleForUpdate(client, bundleId, taskId);
      if (!bundle) {
        const error = new Error('Evidence bundle not found');
        error.status = 404;
        throw error;
      }
      validateBundleStatus(bundle, previewableStatuses);
      await TaskAccessService.assert(bundle.task_id, authContext, 'canSubmitEvidence', client);
      const task = await TaskAccessService.loadTask(bundle.task_id, client);
      const requirements = TaskEvidenceRequirementService.normalizeForTask(task);
      const items = await this.loadItemsForBundle(client, bundle.id);
      if (bundle.status === 'previewed' && bundle.action_id) {
        const action = (await client.query('SELECT * FROM api_actions WHERE id = $1', [bundle.action_id])).rows[0];
        await client.query('COMMIT');
        return {
          bundle: this.serializeBundle(bundle, items.map(item => this.serializeItem(item))),
          action,
          requirements: TaskEvidenceRequirementService.summarize(requirements)
        };
      }

      const previewPayload = {
        title: `Submit evidence for task: ${task.name || task.title || task.id}`,
        summary: `Cerbanimo will freeze ${items.length} evidence item${items.length === 1 ? '' : 's'} and validate them before handing the task to peer/PM review.`,
        task: { id: task.id, name: task.name, status: task.status },
        bundle: { id: bundle.id, bundleUuid: bundle.bundle_uuid, sourceKind: bundle.source_kind },
        requirements: TaskEvidenceRequirementService.summarize(requirements),
        evidenceItemCount: items.length,
        effects: [
          'Freeze the evidence bundle snapshot',
          'Queue deterministic submission validation',
          'Bridge passing work into the existing Cerbanimo review loop'
        ],
        permissions: ['tasks:write', 'actions:write'],
        confirmationRequired: true
      };
      const action = (await client.query(
        `INSERT INTO api_actions (
           intent_json,
           preview_payload,
           source_client,
           actor_user_id,
           related_task_id,
           risk_level,
           status
         )
         VALUES ($1::jsonb, $2::jsonb, $3, $4, $5, 'normal', 'previewed')
         RETURNING *`,
        [
          JSON.stringify({
            functionName: 'tasks.submit_evidence',
            arguments: { taskId: task.id, bundleId: bundle.id, bundleUuid: bundle.bundle_uuid }
          }),
          JSON.stringify(previewPayload),
          sourceClient || 'api',
          authContext.actorUserId || null,
          task.id
        ]
      )).rows[0];
      const updatedBundle = (await client.query(
        `UPDATE task_evidence_bundles
         SET status = 'previewed',
             requirement_snapshot = $2::jsonb,
             validation_policy_snapshot = $3::jsonb,
             action_id = $4,
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [
          bundle.id,
          JSON.stringify(TaskEvidenceRequirementService.summarize(requirements)),
          JSON.stringify({
            validationProviders: ['deterministic'],
            semanticProvider: process.env.CERBANIMO_EVIDENCE_SEMANTIC_PROVIDER || null,
            capturedAt: nowIso()
          }),
          action.id
        ]
      )).rows[0];
      await client.query(
        `INSERT INTO api_action_events (action_id, event_type, actor_user_id, payload)
         VALUES ($1, 'preview.created', $2, $3::jsonb)`,
        [action.id, authContext.actorUserId || null, JSON.stringify({ bundleId: updatedBundle.id, taskId: task.id })]
      );
      await client.query('COMMIT');
      return {
        bundle: this.serializeBundle(updatedBundle, items.map(item => this.serializeItem(item))),
        action,
        requirements: TaskEvidenceRequirementService.summarize(requirements)
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async cancelBundle({ taskId, bundleId, authContext, reason }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const bundle = await this.findBundleForUpdate(client, bundleId, taskId);
      if (!bundle) {
        const error = new Error('Evidence bundle not found');
        error.status = 404;
        throw error;
      }
      await TaskAccessService.assert(bundle.task_id, authContext, 'canSubmitEvidence', client);
      if (terminalBundleStatuses.has(bundle.status)) {
        const error = new Error(`Evidence bundle cannot be cancelled from status ${bundle.status}.`);
        error.status = 409;
        throw error;
      }
      const updated = (await client.query(
        `UPDATE task_evidence_bundles
         SET status = 'cancelled',
             cancelled_at = NOW(),
             updated_at = NOW(),
             validation_policy_snapshot = COALESCE(validation_policy_snapshot, '{}'::jsonb) || $2::jsonb
         WHERE id = $1
         RETURNING *`,
        [bundle.id, JSON.stringify({ cancelReason: reason || null, cancelledAt: nowIso() })]
      )).rows[0];
      if (updated.action_id) {
        await client.query(
          `UPDATE api_actions
           SET status = 'cancelled',
               cancelled_at = NOW()
           WHERE id = $1
             AND status = 'previewed'`,
          [updated.action_id]
        );
      }
      await client.query('COMMIT');
      return this.hydrateBundle(updated.id, authContext);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async confirmEvidenceAction(client, action, { actorUserId, isServiceActor = false, scopes = [], roles = [], confirmation } = {}) {
    const args = action.intent_json?.arguments || action.intent_json?.input || {};
    const taskId = action.related_task_id || args.taskId || args.task_id;
    const bundleId = args.bundleId || args.bundle_id || args.bundleUuid || args.bundle_uuid;
    if (!taskId || !bundleId) {
      const error = new Error('Evidence submission actions require taskId and bundleId.');
      error.status = 400;
      throw error;
    }
    const bundle = await this.findBundleForUpdate(client, bundleId, taskId);
    if (!bundle) {
      const error = new Error('Evidence bundle not found.');
      error.status = 404;
      throw error;
    }
    if (Number(bundle.action_id) !== Number(action.id)) {
      const error = new Error('Evidence bundle is not linked to this action.');
      error.status = 409;
      throw error;
    }
    if (bundle.status !== 'previewed') {
      const error = new Error(`Evidence bundle cannot be confirmed from status ${bundle.status}.`);
      error.status = 409;
      throw error;
    }
    await TaskAccessService.assert(bundle.task_id, { actorUserId, isServiceActor, scopes, roles }, 'canSubmitEvidence', client);
    const template = CapabilityRegistryService.findAutomationTemplate('submission_validation');
    const authoritySnapshot = buildAuthoritySnapshot({ actorUserId, isServiceActor, scopes, roles });
    const run = (await client.query(
      `INSERT INTO automation_runs (
         action_id, template_key, status, input, worker_name, source_client, actor_user_id
       )
       VALUES ($1, 'submission_validation', 'queued', $2::jsonb, $3, $4, $5)
       ON CONFLICT (action_id) WHERE action_id IS NOT NULL
       DO UPDATE SET updated_at = automation_runs.updated_at
       RETURNING *`,
      [
        action.id,
        JSON.stringify({
          taskId: bundle.task_id,
          bundleId: bundle.id,
          bundleUuid: bundle.bundle_uuid,
          authoritySnapshot,
          confirmation: confirmation || {}
        }),
        template?.workerName || null,
        action.source_client,
        actorUserId || null
      ]
    )).rows[0];
    const updatedBundle = (await client.query(
      `UPDATE task_evidence_bundles
       SET status = 'validation_queued',
           submitted_at = NOW(),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [bundle.id]
    )).rows[0];
    const executionResult = {
      status: 'queued',
      message: 'Evidence submission confirmed and queued for validation.',
      automationRunId: run.id,
      runUuid: run.run_uuid,
      bundleId: updatedBundle.id,
      bundleUuid: updatedBundle.bundle_uuid
    };
    const updatedAction = (await client.query(
      `UPDATE api_actions
       SET status = 'confirmed',
           related_automation_run_id = $2,
           confirmation_event = $3::jsonb,
           execution_result = $4::jsonb,
           confirmed_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [
        action.id,
        run.id,
        JSON.stringify({ actorUserId, confirmedAt: nowIso(), confirmation: confirmation || {} }),
        JSON.stringify(executionResult)
      ]
    )).rows[0];
    await client.query(
      `INSERT INTO automation_logs (run_id, level, message, payload)
       VALUES ($1, 'info', 'Evidence validation run queued after action confirmation.', $2::jsonb)`,
      [run.id, JSON.stringify({ actionId: action.id, taskId: bundle.task_id, bundleId: bundle.id })]
    );
    await client.query(
      `INSERT INTO api_action_events (action_id, event_type, actor_user_id, payload)
       VALUES ($1, 'action.confirmed', $2, $3::jsonb), ($1, 'automation.queued', $2, $4::jsonb)`,
      [
        action.id,
        actorUserId || null,
        JSON.stringify({ confirmation: confirmation || {} }),
        JSON.stringify({ runId: run.id, taskId: bundle.task_id, bundleId: bundle.id })
      ]
    );

    return {
      updatedAction,
      automationJob: {
        runId: run.id,
        automationRunId: run.id,
        templateKey: 'submission_validation',
        actionId: action.id
      }
    };
  }

  async validateSubmissionRun(run) {
    const input = run.input || {};
    const bundleId = input.bundleId || input.bundle_id || input.bundleUuid || input.bundle_uuid;
    const bundle = await this.findBundle(bundleId, input.taskId);
    if (!bundle) {
      return {
        status: 'validation_failed',
        reason: 'BUNDLE_NOT_FOUND',
        message: 'Evidence bundle was not found.',
        completedAt: nowIso()
      };
    }
    await pool.query(
      `UPDATE task_evidence_bundles
       SET status = 'validating',
           updated_at = NOW()
       WHERE id = $1
         AND status IN ('validation_queued', 'submitted')`,
      [bundle.id]
    );
    const task = await TaskAccessService.loadTask(bundle.task_id);
    if (!task) {
      return {
        status: 'validation_failed',
        taskId: bundle.task_id,
        bundleId: bundle.id,
        reason: 'TASK_NOT_FOUND',
        message: 'Task was not found.',
        completedAt: nowIso()
      };
    }
    const items = await this.loadItemsForBundle(pool, bundle.id);
    const requirements = parseJsonish(bundle.requirement_snapshot, []).length
      ? parseJsonish(bundle.requirement_snapshot, [])
      : TaskEvidenceRequirementService.summarize(TaskEvidenceRequirementService.normalizeForTask(task));
    const normalizedRequirements = requirements.map(requirement => ({
      ...requirement,
      acceptedEvidenceTypes: requirement.acceptedEvidenceTypes || requirement.proofTypes || requirement.evidenceTypes || [],
      checks: requirement.checks || ['evidence_present'],
      minimumEvidenceItems: Math.max(Number(requirement.minimumEvidenceItems || 1), 1)
    }));
    const requirementResults = [];
    const findings = [];
    for (const requirement of normalizedRequirements) {
      const result = await this.evaluateRequirement({ requirement, task, bundle, items });
      requirementResults.push(result.requirementResult);
      findings.push(...result.findings);
    }
    const status = this.overallValidationStatus(requirementResults);
    return {
      status,
      taskId: task.id,
      bundleId: bundle.id,
      bundleUuid: bundle.bundle_uuid,
      provider: 'deterministic',
      passed: status === 'validation_passed',
      requirementResults,
      findings,
      summary: this.validationSummary(status, requirementResults),
      completedAt: nowIso()
    };
  }

  async finalizeValidationRun(client, { run, result }) {
    const input = run.input || {};
    const bundleId = result.bundleId || input.bundleId || input.bundle_id || input.bundleUuid || input.bundle_uuid;
    const bundle = await this.findBundleForUpdate(client, bundleId, result.taskId || input.taskId);
    if (!bundle) {
      const error = new Error('Evidence bundle not found during validation finalization.');
      error.status = 409;
      throw error;
    }
    const task = await TaskAccessService.loadTask(bundle.task_id, client);
    if (!task) {
      const error = new Error('Task not found during validation finalization.');
      error.status = 409;
      throw error;
    }
    const authority = await this.authorizationContextFromRun(run, client);
    const authorization = await TaskAccessService.policyForTask(task.id, authority, client);
    if (!authorization.canSubmitEvidence?.allowed) {
      await client.query(
        `UPDATE task_evidence_bundles
         SET status = 'validation_failed',
             validated_at = NOW(),
             updated_at = NOW(),
             validation_policy_snapshot = COALESCE(validation_policy_snapshot, '{}'::jsonb) || $2::jsonb
         WHERE id = $1`,
        [
          bundle.id,
          JSON.stringify({
            blockedAt: nowIso(),
            reason: 'FINALIZATION_AUTHORITY_REVOKED',
            authorization: authorization.canSubmitEvidence
          })
        ]
      );
      return {
        ...result,
        status: 'blocked',
        reason: 'FINALIZATION_AUTHORITY_REVOKED',
        message: authorization.canSubmitEvidence?.reason || 'Task evidence authority changed before finalization.',
        submittedTask: false,
        completedAt: nowIso()
      };
    }
    const status = normalizeStatus(result.status);
    const validation = await this.insertValidationResult(client, {
      bundle,
      task,
      run,
      status,
      result,
      provider: result.provider || 'deterministic'
    });

    if (status === 'validation_passed') {
      await this.bridgeTaskToReview(client, { task, bundle, run, result });
    } else if (status === 'manual_review_required') {
      await client.query(
        `INSERT INTO task_validation_reviews (
           validation_result_id, bundle_id, task_id, requested_by, status, reason
         )
         VALUES ($1, $2, $3, $4, 'pending', $5)
         ON CONFLICT DO NOTHING`,
        [
          validation.id,
          bundle.id,
          task.id,
          run.actor_user_id || bundle.actor_user_id || null,
          result.summary || 'Validation requires manual review.'
        ]
      );
    }

    await client.query(
      `UPDATE task_evidence_bundles
       SET status = $2,
           validated_at = NOW(),
           updated_at = NOW()
       WHERE id = $1`,
      [
        bundle.id,
        status === 'validation_failed'
          ? 'validation_failed'
          : status
      ]
    );

    return {
      ...result,
      status,
      validationResultId: validation.id,
      validationUuid: validation.validation_uuid,
      submittedTask: status === 'validation_passed'
    };
  }

  async finalizeQualityReport(client, { run, task, result, actorUserId }) {
    if (result.status !== 'checks_passed') return result;
    const proofUri = result.artifactUri || `cerbanimo://automation-runs/${run.run_uuid || run.id}/quality-check-report`;
    const existing = run.action_id
      ? (await client.query('SELECT * FROM task_evidence_bundles WHERE action_id = $1 FOR UPDATE', [run.action_id])).rows[0]
      : null;
    const bundle = existing || (await client.query(
      `INSERT INTO task_evidence_bundles (
         task_id, actor_user_id, source_kind, status, version, reflection, summary,
         requirement_snapshot, validation_policy_snapshot, action_id, submitted_at
       )
       VALUES (
         $1, $2, 'automation', 'validating',
         COALESCE((SELECT MAX(version) + 1 FROM task_evidence_bundles WHERE task_id = $1 AND actor_user_id = $2), 1),
         $3, $4, $5::jsonb, $6::jsonb, $7, NOW()
       )
       RETURNING *`,
      [
        task.id,
        actorUserId || null,
        `Automated quality-check report from run ${run.run_uuid || run.id}: ${result.summary || 'Quality checks passed.'}`,
        result.summary || 'Quality checks passed.',
        JSON.stringify(TaskEvidenceRequirementService.summarize(TaskEvidenceRequirementService.normalizeForTask(task))),
        JSON.stringify({ generatedFrom: 'run_quality_checks', automationRunId: run.id, capturedAt: nowIso() }),
        run.action_id || null
      ]
    )).rows[0];

    const metadata = {
      report: result,
      taskId: task.id,
      runId: run.id,
      runUuid: run.run_uuid,
      artifactUri: proofUri
    };
    await client.query(
      `INSERT INTO task_evidence_items (
         bundle_id, task_id, actor_user_id, evidence_type, requirement_ids,
         title, artifact_uri, content_sha256, metadata
       )
       VALUES ($1, $2, $3, 'automation_report', '{}', $4, $5, $6, $7::jsonb)
       ON CONFLICT DO NOTHING`,
      [
        bundle.id,
        task.id,
        actorUserId || null,
        'Quality-check automation report',
        proofUri,
        jsonHash(metadata),
        JSON.stringify(metadata)
      ]
    );

    const validationResult = {
      status: 'validation_passed',
      taskId: task.id,
      bundleId: bundle.id,
      bundleUuid: bundle.bundle_uuid,
      provider: 'deterministic',
      passed: true,
      requirementResults: [{
        requirementId: 'automation-report',
        verdict: 'satisfied',
        evidenceItemIds: [],
        messages: ['Quality checks passed and were attached as canonical evidence.']
      }],
      findings: [{
        requirementId: 'automation-report',
        severity: 'info',
        code: 'AUTOMATION_REPORT_ACCEPTED',
        message: 'Passing quality-check report was accepted as canonical task evidence.'
      }],
      summary: result.summary || 'Quality checks passed.',
      completedAt: nowIso()
    };
    const validation = await this.insertValidationResult(client, {
      bundle,
      task,
      run,
      status: 'validation_passed',
      result: validationResult,
      provider: 'deterministic'
    });
    await this.bridgeTaskToReview(client, { task, bundle, run, result: validationResult });
    await client.query(
      `UPDATE task_evidence_bundles
       SET status = 'validation_passed',
           validated_at = NOW(),
           updated_at = NOW()
       WHERE id = $1`,
      [bundle.id]
    );
    return {
      ...result,
      evidenceBundleId: bundle.id,
      evidenceBundleUuid: bundle.bundle_uuid,
      validationResultId: validation.id,
      validationStatus: 'validation_passed',
      submittedTask: true
    };
  }

  async createItemWithClient(client, bundle, item, requirements = []) {
    const evidenceType = item.evidenceType || item.evidence_type || 'text';
    const requirementIds = asArray(item.requirementIds || item.requirement_ids).map(String).filter(Boolean);
    const knownRequirementIds = new Set(asArray(requirements).map(requirement => String(requirement.requirementId)));
    const unknown = requirementIds.filter(id => knownRequirementIds.size > 0 && !knownRequirementIds.has(id));
    if (unknown.length > 0) {
      const error = new Error(`Unknown validation requirement ids: ${unknown.join(', ')}`);
      error.status = 422;
      error.code = 'UNKNOWN_VALIDATION_REQUIREMENT';
      throw error;
    }

    let textContent = item.textContent ?? item.text_content ?? item.content ?? null;
    let sourceUrl = item.sourceUrl || item.source_url || null;
    let canonicalUrl = item.canonicalUrl || item.canonical_url || null;
    let artifactUri = item.artifactUri || item.artifact_uri || null;
    let blobStorageKey = item.blobStorageKey || item.blob_storage_key || null;
    let mediaType = item.mediaType || item.media_type || null;
    let byteSize = item.byteSize || item.byte_size || null;
    let contentSha256 = item.contentSha256 || item.content_sha256 || null;
    const metadata = item.metadata || {};

    if (['text', 'reflection', 'attestation'].includes(evidenceType)) {
      textContent = compactText(textContent || '', 20000);
      if (!textContent) {
        const error = new Error('Text evidence requires textContent.');
        error.status = 400;
        throw error;
      }
      byteSize = Buffer.byteLength(textContent, 'utf8');
      contentSha256 = EvidenceArtifactStore.contentHash(Buffer.from(textContent, 'utf8'));
    } else if (['image', 'document'].includes(evidenceType)) {
      const base64 = item.contentBase64 || item.content_base64;
      if (!base64 && !blobStorageKey) {
        const error = new Error('Image and document evidence require contentBase64 or blobStorageKey.');
        error.status = 400;
        throw error;
      }
      if (base64) {
        const buffer = Buffer.from(String(base64), 'base64');
        await EvidenceArtifactStore.assertBundleSize(bundle.id, buffer.length, client);
        const blob = await EvidenceArtifactStore.putBuffer({ buffer, mediaType, metadata, client });
        blobStorageKey = blob.storage_key;
        mediaType = blob.media_type;
        byteSize = blob.byte_size;
        contentSha256 = blob.content_sha256;
      }
    } else if (evidenceType === 'artifact_reference') {
      artifactUri = String(artifactUri || '');
      if (!artifactUri) {
        const error = new Error('Artifact reference evidence requires artifactUri.');
        error.status = 400;
        throw error;
      }
      contentSha256 = jsonHash({ artifactUri, metadata });
      byteSize = Buffer.byteLength(artifactUri, 'utf8');
    } else if (evidenceType === 'automation_report') {
      contentSha256 = contentSha256 || jsonHash(metadata);
      byteSize = byteSize || Buffer.byteLength(JSON.stringify(metadata), 'utf8');
    } else if (evidenceType === 'url_snapshot') {
      if (!blobStorageKey || !sourceUrl) {
        const error = new Error('URL snapshot evidence must be created through fetch-url.');
        error.status = 400;
        throw error;
      }
    }

    if (!contentSha256) {
      const error = new Error('Evidence item content hash could not be resolved.');
      error.status = 400;
      throw error;
    }

    const result = await client.query(
      `INSERT INTO task_evidence_items (
         bundle_id, task_id, actor_user_id, evidence_type, requirement_ids,
         title, text_content, source_url, canonical_url, artifact_uri,
         blob_storage_key, media_type, byte_size, content_sha256, metadata
       )
       VALUES ($1, $2, $3, $4, $5::text[], $6, $7, $8, $9, $10, $11, $12, $13, $14, $15::jsonb)
       RETURNING *`,
      [
        bundle.id,
        bundle.task_id,
        bundle.actor_user_id || null,
        evidenceType,
        requirementIds,
        compactText(item.title || evidenceType, 200) || null,
        textContent,
        sourceUrl,
        canonicalUrl,
        artifactUri,
        blobStorageKey,
        mediaType,
        byteSize,
        contentSha256,
        JSON.stringify(metadata || {})
      ]
    );
    return result.rows[0];
  }

  async evaluateRequirement({ requirement, task, bundle, items }) {
    const accepted = new Set(asArray(requirement.acceptedEvidenceTypes).map(String));
    const matchingItems = items.filter(item => {
      const requirementIds = asArray(item.requirement_ids);
      const matchesRequirement = requirementIds.length === 0 || requirementIds.includes(requirement.requirementId);
      const matchesType = accepted.size === 0 || accepted.has(item.evidence_type);
      return matchesRequirement && matchesType;
    });
    const findings = [];
    let verdict = matchingItems.length >= Number(requirement.minimumEvidenceItems || 1) ? 'satisfied' : 'insufficient_evidence';
    if (verdict !== 'satisfied') {
      findings.push({
        requirementId: requirement.requirementId,
        severity: 'medium',
        code: 'INSUFFICIENT_EVIDENCE',
        message: `${requirement.description} needs at least ${requirement.minimumEvidenceItems || 1} matching evidence item(s).`,
        evidenceItemIds: matchingItems.map(item => item.id)
      });
    }

    const checks = asArray(requirement.checks);
    for (const check of checks) {
      if (check === 'reflection_present') {
        const hasReflection = Boolean(compactText(bundle.reflection || ''))
          || matchingItems.some(item => item.evidence_type === 'reflection' && compactText(item.text_content || ''));
        if (!hasReflection) {
          verdict = 'insufficient_evidence';
          findings.push({
            requirementId: requirement.requirementId,
            severity: 'medium',
            code: 'REFLECTION_MISSING',
            message: 'A reflection is required before this task can move to review.',
            evidenceItemIds: []
          });
        }
      }
      if (check === 'report_status_checks_passed') {
        const passingReport = matchingItems.some(item => {
          const metadata = item.metadata || {};
          const report = metadata.report || metadata;
          return item.evidence_type === 'automation_report' && report.status === 'checks_passed';
        });
        if (!passingReport) {
          verdict = 'insufficient_evidence';
          findings.push({
            requirementId: requirement.requirementId,
            severity: 'high',
            code: 'PASSING_AUTOMATION_REPORT_MISSING',
            message: 'A passing automation report is required.',
            evidenceItemIds: matchingItems.map(item => item.id)
          });
        }
      }
      if (check === 'report_belongs_to_task') {
        const mismatched = matchingItems.filter(item => {
          const metadata = item.metadata || {};
          const report = metadata.report || metadata;
          const reportTaskId = metadata.taskId || report.taskId;
          return item.evidence_type === 'automation_report' && reportTaskId && Number(reportTaskId) !== Number(task.id);
        });
        if (mismatched.length > 0) {
          verdict = 'failed';
          findings.push({
            requirementId: requirement.requirementId,
            severity: 'critical',
            code: 'AUTOMATION_REPORT_TASK_MISMATCH',
            message: 'An automation report belongs to a different task.',
            evidenceItemIds: mismatched.map(item => item.id)
          });
        }
      }
      if (check === 'resolved_commit_present') {
        const hasRef = matchingItems.some(item => {
          const metadata = item.metadata || {};
          const report = metadata.report || metadata;
          return metadata.ref || metadata.commit || report.ref || report.commit;
        });
        if (!hasRef) {
          verdict = 'insufficient_evidence';
          findings.push({
            requirementId: requirement.requirementId,
            severity: 'medium',
            code: 'RESOLVED_REF_MISSING',
            message: 'A resolved ref or commit is required for this evidence.',
            evidenceItemIds: matchingItems.map(item => item.id)
          });
        }
      }
      if (check === 'distinct_evidence_items' || check === 'no_duplicate_hashes') {
        const uniqueHashes = new Set(matchingItems.map(item => item.content_sha256).filter(Boolean));
        if (uniqueHashes.size < Math.min(matchingItems.length, Number(requirement.minimumEvidenceItems || 1))) {
          verdict = 'insufficient_evidence';
          findings.push({
            requirementId: requirement.requirementId,
            severity: 'medium',
            code: 'DUPLICATE_EVIDENCE_HASHES',
            message: 'Distinct evidence is required for this validation requirement.',
            evidenceItemIds: matchingItems.map(item => item.id)
          });
        }
      }
      if (check === 'source_url_captured') {
        const missingSnapshot = matchingItems.filter(item => item.evidence_type === 'url_snapshot' && !item.canonical_url);
        if (missingSnapshot.length > 0 || matchingItems.every(item => item.evidence_type !== 'url_snapshot')) {
          verdict = 'insufficient_evidence';
          findings.push({
            requirementId: requirement.requirementId,
            severity: 'medium',
            code: 'URL_SNAPSHOT_MISSING',
            message: 'A fetched URL snapshot is required.',
            evidenceItemIds: matchingItems.map(item => item.id)
          });
        }
      }
    }

    if (requirement.semanticReview && verdict === 'satisfied') {
      const semantic = await EvidenceValidationProvider.semanticReview({ requirement, items: matchingItems, bundle, task });
      if (semantic.status === 'needs_more_evidence') {
        verdict = 'insufficient_evidence';
      } else if (semantic.status === 'manual_review_required') {
        verdict = 'manual_review_required';
      } else if (semantic.status !== 'passed') {
        verdict = 'failed';
      }
      findings.push({
        requirementId: requirement.requirementId,
        severity: semantic.status === 'passed' ? 'info' : 'medium',
        code: `SEMANTIC_${String(semantic.status).toUpperCase()}`,
        message: semantic.message,
        evidenceItemIds: semantic.evidenceItemIds || matchingItems.map(item => item.id)
      });
    }

    return {
      requirementResult: {
        requirementId: requirement.requirementId,
        description: requirement.description,
        verdict,
        evidenceItemIds: matchingItems.map(item => item.id),
        checks
      },
      findings
    };
  }

  overallValidationStatus(requirementResults) {
    if (requirementResults.some(result => result.verdict === 'failed')) return 'validation_failed';
    if (requirementResults.some(result => result.verdict === 'manual_review_required')) return 'manual_review_required';
    if (requirementResults.some(result => result.verdict === 'insufficient_evidence')) return 'needs_more_evidence';
    return 'validation_passed';
  }

  validationSummary(status, requirementResults) {
    const passed = requirementResults.filter(result => result.verdict === 'satisfied').length;
    const total = requirementResults.length;
    if (status === 'validation_passed') return `Evidence validation passed ${passed}/${total} requirement(s). The task was moved to review.`;
    if (status === 'needs_more_evidence') return `Evidence validation needs more information. ${passed}/${total} requirement(s) passed.`;
    if (status === 'manual_review_required') return `Evidence validation requires manual review. ${passed}/${total} requirement(s) passed.`;
    return `Evidence validation failed. ${passed}/${total} requirement(s) passed.`;
  }

  async insertValidationResult(client, { bundle, task, run, status, result, provider }) {
    const existing = run?.id
      ? (await client.query('SELECT * FROM task_validation_results WHERE automation_run_id = $1 LIMIT 1', [run.id])).rows[0]
      : null;
    const validation = existing || (await client.query(
      `INSERT INTO task_validation_results (
         bundle_id, task_id, automation_run_id, provider, status, overall_verdict,
         requirement_results, summary, metadata
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9::jsonb)
       RETURNING *`,
      [
        bundle.id,
        task.id,
        run?.id || null,
        provider || 'deterministic',
        status.replace(/^validation_/, ''),
        status.replace(/^validation_/, ''),
        JSON.stringify(result.requirementResults || []),
        result.summary || null,
        JSON.stringify({ result, createdFromRun: run?.id || null })
      ]
    )).rows[0];

    if (!existing) {
      for (const finding of asArray(result.findings)) {
        await client.query(
          `INSERT INTO task_validation_findings (
             validation_result_id, task_id, bundle_id, requirement_id, severity,
             code, message, evidence_item_ids, metadata
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8::bigint[], $9::jsonb)`,
          [
            validation.id,
            task.id,
            bundle.id,
            finding.requirementId || finding.requirement_id || null,
            finding.severity || 'info',
            finding.code || 'VALIDATION_FINDING',
            finding.message || '',
            asArray(finding.evidenceItemIds || finding.evidence_item_ids).map(Number).filter(Number.isFinite),
            JSON.stringify(finding.metadata || {})
          ]
        );
      }
    }
    return validation;
  }

  async bridgeTaskToReview(client, { task, bundle, run, result }) {
    const proofUri = `cerbanimo://evidence-bundles/${bundle.bundle_uuid || bundle.id}`;
    const actorUserId = run.actor_user_id || bundle.actor_user_id || null;
    await client.query(
      `INSERT INTO task_automation_submissions (run_id, task_id, submitted_by, proof_uri, report)
       VALUES ($1, $2, $3, $4, $5::jsonb)
       ON CONFLICT (run_id) DO NOTHING`,
      [run.id, task.id, actorUserId, proofUri, JSON.stringify(result)]
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
           reflection = COALESCE(NULLIF(reflection, ''), NULLIF($3, '')),
           submitted_by = COALESCE(submitted_by, $4)
       WHERE id = $1`,
      [
        task.id,
        proofUri,
        bundle.reflection || result.summary || 'Evidence validation passed.',
        actorUserId
      ]
    );
    await client.query(
      `INSERT INTO automation_logs (run_id, level, message, payload)
       VALUES ($1, 'info', 'Task evidence passed validation and was bridged to review.', $2::jsonb)`,
      [run.id, JSON.stringify({ taskId: task.id, bundleId: bundle.id, proofUri })]
    );
  }

  async authorizationContextFromRun(run, client = pool) {
    const snapshot = run.input?.authoritySnapshot || {};
    const actorUserId = run.actor_user_id || snapshot.actorUserId || null;
    const currentUser = actorUserId
      ? (await client.query('SELECT roles FROM users WHERE id = $1 LIMIT 1', [actorUserId])).rows[0]
      : null;
    const durableActorUserId = currentUser ? actorUserId : null;
    return {
      actorUserId: durableActorUserId,
      isServiceActor: Boolean(snapshot.isServiceActor),
      scopes: asArray(snapshot.scopes),
      roles: asArray(currentUser?.roles)
    };
  }

  async hydrateBundle(bundleId, authContext, extra = {}) {
    const bundle = await this.findBundle(bundleId);
    if (!bundle) return null;
    await TaskAccessService.assert(bundle.task_id, authContext, 'canViewEvidence');
    const items = await this.loadItemsForBundle(pool, bundle.id);
    const validations = await pool.query(
      `SELECT *
       FROM task_validation_results
       WHERE bundle_id = $1
       ORDER BY created_at DESC`,
      [bundle.id]
    );
    const action = bundle.action_id
      ? (await pool.query('SELECT * FROM api_actions WHERE id = $1', [bundle.action_id])).rows[0] || null
      : null;
    return {
      bundle: this.serializeBundle(bundle, items.map(item => this.serializeItem(item))),
      action,
      validations: validations.rows,
      ...extra
    };
  }

  async findActiveDraft(client, taskId, actorUserId) {
    const result = await client.query(
      `SELECT *
       FROM task_evidence_bundles
       WHERE task_id = $1
         AND (($2::int IS NULL AND actor_user_id IS NULL) OR actor_user_id = $2)
         AND status = 'draft'
       ORDER BY updated_at DESC, id DESC
       LIMIT 1`,
      [taskId, actorUserId || null]
    );
    return result.rows[0] || null;
  }

  async findBundle(bundleId, taskId = null) {
    const params = [String(bundleId)];
    const filters = ['(id::text = $1 OR bundle_uuid::text = $1)'];
    if (taskId) {
      params.push(String(taskId));
      filters.push(`task_id::text = $${params.length}`);
    }
    const result = await pool.query(
      `SELECT *
       FROM task_evidence_bundles
       WHERE ${filters.join(' AND ')}
       LIMIT 1`,
      params
    );
    return result.rows[0] || null;
  }

  async findBundleForUpdate(client, bundleId, taskId = null) {
    const params = [String(bundleId)];
    const filters = ['(id::text = $1 OR bundle_uuid::text = $1)'];
    if (taskId) {
      params.push(String(taskId));
      filters.push(`task_id::text = $${params.length}`);
    }
    const result = await client.query(
      `SELECT *
       FROM task_evidence_bundles
       WHERE ${filters.join(' AND ')}
       FOR UPDATE`,
      params
    );
    return result.rows[0] || null;
  }

  async loadItemsForBundle(client = pool, bundleId) {
    const result = await client.query(
      `SELECT *
       FROM task_evidence_items
       WHERE bundle_id = $1
       ORDER BY created_at ASC, id ASC`,
      [bundleId]
    );
    return result.rows;
  }

  serializeBundle(bundle, items = []) {
    return {
      ...bundle,
      actionId: actionIdFromBundle(bundle),
      items
    };
  }

  serializeItem(item) {
    return {
      ...item,
      text_content: item.text_content ? compactText(item.text_content, 1000) : item.text_content
    };
  }
}

export { buildAuthoritySnapshot };
export default new TaskEvidenceService();
