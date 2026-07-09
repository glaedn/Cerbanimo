import crypto from 'crypto';
import pool from '../db.js';
import CapabilityRegistryService from './CapabilityRegistryService.js';
import TaskAccessService from './TaskAccessService.js';
import TaskEvidenceRequirementService from './TaskEvidenceRequirementService.js';
import EvidenceArtifactStore from './EvidenceArtifactStore.js';
import EvidenceFetchService from './EvidenceFetchService.js';
import EvidenceValidationProvider from './EvidenceValidationProvider.js';
import EvidenceArtifactReferenceResolver from './EvidenceArtifactReferenceResolver.js';
import { decodeStrictBase64, inspectBinary } from './EvidenceBinaryInspectionService.js';
import EvidenceCanonicalDigestService, { MANIFEST_VERSION } from './EvidenceCanonicalDigestService.js';

const draftStatuses = new Set(['draft']);
const previewableStatuses = new Set(['draft', 'previewed']);
const terminalBundleStatuses = new Set(['validation_passed', 'validation_failed', 'cancelled', 'superseded']);
const canonicalEvidenceTypes = new Set([
  'text',
  'url_snapshot',
  'image',
  'document',
  'artifact_reference',
  'repository_commit',
  'pull_request',
  'automation_report',
  'command_result',
  'attestation',
  'receipt',
  'reflection'
]);
const deterministicChecks = new Set([
  'evidence_present',
  'reflection_present',
  'report_status_checks_passed',
  'report_belongs_to_task',
  'resolved_commit_present',
  'distinct_evidence_items',
  'no_duplicate_hashes',
  'source_url_captured',
  'artifact_reference_authorized',
  'command_exit_zero',
  'receipt_present',
  'attestation_present'
]);

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

function permissionError(message, code = 'EVIDENCE_BUNDLE_OWNER_REQUIRED') {
  const error = new Error(message);
  error.status = 403;
  error.code = code;
  return error;
}

function actorOwnsBundle(bundle, authContext = {}) {
  return Boolean(bundle?.actor_user_id && authContext?.actorUserId && Number(bundle.actor_user_id) === Number(authContext.actorUserId));
}

function isServiceEvidenceOperation(bundle, authContext = {}) {
  return Boolean(authContext.isServiceActor && bundle?.source_kind === 'automation');
}

function coverageSummary(requirements = [], items = []) {
  const itemRows = asArray(items);
  return asArray(requirements).map(requirement => {
    const accepted = new Set(asArray(requirement.acceptedEvidenceTypes || requirement.proofTypes).map(String));
    const matches = itemRows.filter(item => {
      const ids = asArray(item.requirement_ids || item.requirementIds).map(String);
      if (ids.length === 0 && asArray(requirements).length > 1) return false;
      const idMatch = ids.length === 0 || ids.includes(String(requirement.requirementId));
      const typeMatch = accepted.size === 0 || accepted.has(String(item.evidence_type || item.evidenceType));
      return idMatch && typeMatch;
    });
    return {
      requirementId: requirement.requirementId,
      status: matches.length >= Number(requirement.minimumEvidenceItems || 1) ? 'covered' : 'needs_evidence',
      evidenceItemCount: matches.length
    };
  });
}

class TaskEvidenceService {
  async assertBundleMutationAuthority(client, bundle, authContext, operation = 'mutate') {
    const policy = await TaskAccessService.assert(bundle.task_id, authContext, 'canSubmitEvidence', client);
    if (['human', 'mixed'].includes(bundle.source_kind || 'human') && !actorOwnsBundle(bundle, authContext)) {
      throw permissionError(`Only the contributor who owns this evidence bundle can ${operation} it.`);
    }
    if (bundle.source_kind === 'automation' && !isServiceEvidenceOperation(bundle, authContext) && !actorOwnsBundle(bundle, authContext)) {
      throw permissionError(`Automation evidence bundles require the owning actor or service scope to ${operation}.`, 'EVIDENCE_SERVICE_OPERATION_REQUIRED');
    }
    return policy;
  }

  async evidencePolicy(taskId, authContext, client = pool) {
    const policy = await TaskAccessService.policyForTask(taskId, authContext, client);
    if (!policy.exists) {
      const error = new Error('Task not found');
      error.status = 404;
      throw error;
    }
    if (!policy.canViewEvidenceSummary?.allowed) {
      const error = new Error(policy.canViewEvidenceSummary?.reason || 'Evidence is not visible to this actor.');
      error.status = 403;
      error.code = policy.canViewEvidenceSummary?.code || 'EVIDENCE_SUMMARY_DENIED';
      throw error;
    }
    return policy;
  }

  async buildFrozenManifest(client, bundle, items, requirements, { task, validationPolicySnapshot = {}, persistItemDigests = false } = {}) {
    return (await EvidenceCanonicalDigestService.buildManifest({
      client,
      bundle,
      items,
      task: task || await TaskAccessService.loadTask(bundle.task_id, client),
      requirements,
      validationPolicySnapshot,
      persistItemDigests
    })).manifest;
  }

  manifestFailure(code, message, metadata = {}, status = 'validation_failed') {
    return {
      ok: false,
      status,
      finding: {
        requirementId: null,
        severity: status === 'manual_review_required' ? 'high' : 'critical',
        code,
        message,
        evidenceItemIds: [],
        metadata
      }
    };
  }

  async verifyFrozenManifest(client, bundle, task) {
    const frozenManifest = parseJsonish(bundle.frozen_manifest, null);
    if (!frozenManifest || !bundle.manifest_sha256) {
      return this.manifestFailure('EVIDENCE_MANIFEST_MISMATCH', 'Frozen evidence manifest is missing.');
    }
    if (frozenManifest.manifestVersion !== MANIFEST_VERSION) {
      return this.manifestFailure(
        'EVIDENCE_MANIFEST_MISMATCH',
        'Legacy evidence manifest requires manual validation review before it can proceed.',
        { manifestVersion: frozenManifest.manifestVersion || 'legacy-v1' },
        'manual_review_required'
      );
    }
    const items = await this.loadItemsForBundle(client, bundle.id);
    const requirements = parseJsonish(bundle.requirement_snapshot, []).length
      ? parseJsonish(bundle.requirement_snapshot, [])
      : TaskEvidenceRequirementService.summarize(TaskEvidenceRequirementService.normalizeForTask(task));
    const validationPolicySnapshot = parseJsonish(bundle.validation_policy_snapshot, {});
    let rebuilt;
    let itemDigests;
    try {
      const digestResult = await EvidenceCanonicalDigestService.buildManifest({
        client,
        bundle,
        items,
        task,
        requirements,
        validationPolicySnapshot
      });
      rebuilt = digestResult.manifest;
      itemDigests = digestResult.itemDigests;
    } catch (error) {
      return this.manifestFailure(
        error.code || 'EVIDENCE_CANONICALIZER_UNAVAILABLE',
        error.message || 'Evidence canonicalization failed before validation.',
        {},
        error.code === 'EVIDENCE_ARTIFACT_UNAUTHORIZED' ? 'validation_failed' : 'manual_review_required'
      );
    }
    if (rebuilt.manifestSha256 !== bundle.manifest_sha256 || rebuilt.manifestSha256 !== frozenManifest.manifestSha256) {
      return this.manifestFailure('EVIDENCE_MANIFEST_MISMATCH', 'Evidence manifest no longer matches the frozen preview snapshot.', {
        expected: bundle.manifest_sha256,
        actual: rebuilt.manifestSha256
      });
    }

    const itemsById = new Map(items.map(item => [Number(item.id), item]));
    const digestByItemId = new Map(itemDigests.map(({ item, digest }) => [Number(item.id), digest]));
    for (const manifestItem of asArray(frozenManifest.items)) {
      const row = itemsById.get(Number(manifestItem.itemId));
      if (!row) {
        return this.manifestFailure('EVIDENCE_ITEM_MISSING', 'A frozen evidence item is missing before validation.', { itemId: manifestItem.itemId });
      }
      const digest = digestByItemId.get(Number(manifestItem.itemId));
      if (!digest || digest.contentSha256 !== manifestItem.contentSha256) {
        return this.manifestFailure('EVIDENCE_CONTENT_HASH_MISMATCH', 'A frozen evidence item content digest no longer matches its manifest.', { itemId: manifestItem.itemId });
      }
      if (digest.provenanceSha256 !== manifestItem.provenanceSha256) {
        return this.manifestFailure('EVIDENCE_PROVENANCE_HASH_MISMATCH', 'A frozen evidence item provenance digest no longer matches its manifest.', { itemId: manifestItem.itemId });
      }
      if (digest.combinedSha256 !== manifestItem.combinedSha256) {
        return this.manifestFailure('EVIDENCE_MANIFEST_MISMATCH', 'A frozen evidence item combined digest no longer matches its manifest.', { itemId: manifestItem.itemId });
      }
      if (row.blob_storage_key) {
        const blob = await EvidenceArtifactStore.getByStorageKey(row.blob_storage_key, client);
        if (!blob || EvidenceArtifactStore.contentHash(blob.content) !== manifestItem.contentSha256) {
          return this.manifestFailure('EVIDENCE_BLOB_HASH_MISMATCH', 'Stored evidence blob hash no longer matches the frozen manifest.', { itemId: manifestItem.itemId });
        }
      }
      if (row.evidence_type === 'artifact_reference') {
        try {
          const resolved = await EvidenceArtifactReferenceResolver.resolve({
            artifactUri: row.artifact_uri,
            taskId: bundle.task_id,
            authContext: {
              actorUserId: bundle.actor_user_id,
              isServiceActor: bundle.source_kind === 'automation',
              scopes: bundle.source_kind === 'automation' ? ['evidence:service'] : []
            },
            client
          });
          if (resolved.contentSha256 !== row.content_sha256) {
            return this.manifestFailure('EVIDENCE_ARTIFACT_UNAUTHORIZED', 'Artifact reference content changed or is no longer authorized.', { itemId: manifestItem.itemId });
          }
        } catch (error) {
          return this.manifestFailure('EVIDENCE_ARTIFACT_UNAUTHORIZED', error.message || 'Artifact reference is no longer authorized.', { itemId: manifestItem.itemId });
        }
      }
    }

    return { ok: true, items, requirements };
  }

  async listEvidence({ taskId, authContext }) {
    const task = await TaskAccessService.loadTask(taskId);
    if (!task) return null;
    const policy = await this.evidencePolicy(task.id, authContext);
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
      itemsByBundle.set(key, [...(itemsByBundle.get(key) || []), item]);
    }
    const requirements = TaskEvidenceRequirementService.summarize(TaskEvidenceRequirementService.normalizeForTask(task));
    return {
      task,
      requirements,
      bundles: bundles.rows.map(bundle => this.serializeBundle(bundle, itemsByBundle.get(String(bundle.id)) || [], {
        policy,
        authContext,
        requirements
      })),
      validations: validations.rows.map(validation => this.serializeValidation(validation, { policy }))
    };
  }

  async createBundle({ taskId, actorUserId, authContext, sourceKind = 'human', reflection = '', summary = '' }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const taskResult = await client.query(
        `SELECT t.*,
                p.creator_id AS project_creator_id,
                p.visibility AS project_visibility,
                p.status AS project_status,
                p.community_id AS project_community_id
         FROM tasks t
         LEFT JOIN projects p ON p.id = t.project_id
         WHERE t.id::text = $1
         FOR UPDATE OF t`,
        [String(taskId)]
      );
      const task = taskResult.rows[0] || null;
      if (!task) {
        const error = new Error('Task not found');
        error.status = 404;
        throw error;
      }
      const normalizedSourceKind = sourceKind || 'human';
      if (['human', 'mixed'].includes(normalizedSourceKind) && !actorUserId) {
        throw permissionError('Human evidence bundles require an authenticated owning contributor.', 'EVIDENCE_BUNDLE_ACTOR_REQUIRED');
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
          normalizedSourceKind,
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
    await this.evidencePolicy(bundle.task_id, authContext);
    return this.hydrateBundle(bundle.id, authContext);
  }

  async getValidationResult({ taskId, validationId, authContext }) {
    const policy = await this.evidencePolicy(taskId, authContext);
    const result = await pool.query(
      `SELECT vr.*,
              COALESCE(json_agg(vf ORDER BY vf.created_at ASC) FILTER (WHERE vf.id IS NOT NULL), '[]') AS findings
       FROM task_validation_results vr
       LEFT JOIN task_validation_findings vf ON vf.validation_result_id = vr.id
       WHERE vr.task_id::text = $1
         AND (vr.id::text = $2 OR vr.validation_uuid::text = $2)
       GROUP BY vr.id
       LIMIT 1`,
      [String(taskId), String(validationId)]
    );
    if (!result.rows[0]) return null;
    return this.serializeValidation(result.rows[0], { policy });
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
      await this.assertBundleMutationAuthority(client, bundle, authContext, 'update');
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
      await this.assertBundleMutationAuthority(client, bundle, authContext, 'add evidence to');
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
      await this.assertBundleMutationAuthority(client, bundle, authContext, 'delete evidence from');
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
    let fetchRecord;
    const reserveClient = await pool.connect();
    try {
      await reserveClient.query('BEGIN');
      const bundle = await this.findBundleForUpdate(reserveClient, bundleId, taskId);
      if (!bundle) {
        const error = new Error('Evidence bundle not found');
        error.status = 404;
        throw error;
      }
      validateBundleStatus(bundle, draftStatuses);
      await this.assertBundleMutationAuthority(reserveClient, bundle, authContext, 'fetch URL evidence into');
      fetchRecord = (await reserveClient.query(
        `INSERT INTO task_evidence_fetches (bundle_id, task_id, actor_user_id, status, requested_url)
         VALUES ($1, $2, $3, 'pending', $4)
         RETURNING *`,
        [bundle.id, bundle.task_id, authContext.actorUserId || null, String(url)]
      )).rows[0];
      await reserveClient.query('COMMIT');
    } catch (error) {
      await reserveClient.query('ROLLBACK');
      throw error;
    } finally {
      reserveClient.release();
    }

    let snapshot;
    try {
      snapshot = await EvidenceFetchService.fetchSnapshot(url);
    } catch (error) {
      await pool.query(
        `UPDATE task_evidence_fetches
         SET status = 'failed',
             error_code = $2,
             error_message = $3,
             completed_at = NOW()
         WHERE id = $1
           AND status = 'pending'`,
        [fetchRecord.id, error.code || 'EVIDENCE_URL_FETCH_FAILED', error.message || String(error)]
      );
      throw error;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const fetchRow = (await client.query(
        `SELECT *
         FROM task_evidence_fetches
         WHERE id = $1
         FOR UPDATE`,
        [fetchRecord.id]
      )).rows[0];
      const bundle = await this.findBundleForUpdate(client, bundleId, taskId);
      if (!fetchRow || fetchRow.status !== 'pending' || !bundle || bundle.status !== 'draft') {
        await client.query(
          `UPDATE task_evidence_fetches
           SET status = 'cancelled',
               error_code = 'EVIDENCE_FETCH_STALE',
               error_message = 'Bundle changed before the fetched evidence could be attached.',
               completed_at = NOW()
           WHERE id = $1`,
          [fetchRecord.id]
        );
        const error = new Error('Evidence fetch could not be attached because the bundle is no longer a mutable draft.');
        error.status = 409;
        error.code = 'EVIDENCE_FETCH_STALE';
        throw error;
      }
      await this.assertBundleMutationAuthority(client, bundle, authContext, 'attach fetched URL evidence to');
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
          capturedAt: nowIso(),
          sourceUrl: snapshot.sourceUrl,
          canonicalUrl: snapshot.canonicalUrl,
          originalMediaType: snapshot.originalMediaType,
          pinnedAddress: snapshot.pinnedAddress,
          metadataPolicy: snapshot.metadataPolicy
        }
      }, TaskEvidenceRequirementService.normalizeForTask(await TaskAccessService.loadTask(bundle.task_id, client)));
      await client.query(
        `UPDATE task_evidence_fetches
         SET status = 'completed',
             canonical_url = $2,
             evidence_item_id = $3,
             response_status = $4,
             original_media_type = $5,
             pinned_address = $6,
             completed_at = NOW()
         WHERE id = $1`,
        [fetchRecord.id, snapshot.canonicalUrl, item.id, snapshot.statusCode || null, snapshot.originalMediaType || null, snapshot.pinnedAddress || null]
      );
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
      await this.assertBundleMutationAuthority(client, bundle, authContext, 'preview');
      const task = await TaskAccessService.loadTask(bundle.task_id, client);
      const requirements = TaskEvidenceRequirementService.normalizeForTask(task);
      const items = await this.loadItemsForBundle(client, bundle.id);
      if (bundle.status === 'previewed' && bundle.action_id) {
        const action = (await client.query('SELECT * FROM api_actions WHERE id = $1', [bundle.action_id])).rows[0];
        await client.query('COMMIT');
        return {
          bundle: this.serializeBundle(bundle, items, { authContext, requirements }),
          action,
          requirements: TaskEvidenceRequirementService.summarize(requirements)
        };
      }

      const validationPolicySnapshot = {
        validationProviders: ['deterministic'],
        semanticProvider: process.env.CERBANIMO_EVIDENCE_SEMANTIC_PROVIDER || null,
        policyVersion: 'submission-validation-v2',
        capturedAt: nowIso()
      };
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
      const frozenManifest = await this.buildFrozenManifest(client, bundle, items, requirements, {
        task,
        validationPolicySnapshot,
        persistItemDigests: true
      });
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
             frozen_manifest = $5::jsonb,
             manifest_sha256 = $6,
             frozen_at = NOW(),
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [
          bundle.id,
          JSON.stringify(TaskEvidenceRequirementService.summarize(requirements)),
          JSON.stringify(validationPolicySnapshot),
          action.id,
          JSON.stringify(frozenManifest),
          frozenManifest.manifestSha256
        ]
      )).rows[0];
      await client.query(
        `INSERT INTO api_action_events (action_id, event_type, actor_user_id, payload)
         VALUES ($1, 'preview.created', $2, $3::jsonb)`,
        [action.id, authContext.actorUserId || null, JSON.stringify({ bundleId: updatedBundle.id, taskId: task.id })]
      );
      await client.query('COMMIT');
      return {
        bundle: this.serializeBundle(updatedBundle, items, { authContext, requirements }),
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
    const existingBundle = await this.findBundle(bundleId, taskId);
    if (!existingBundle) {
      const error = new Error('Evidence bundle not found');
      error.status = 404;
      throw error;
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const action = existingBundle.action_id
        ? (await client.query('SELECT * FROM api_actions WHERE id = $1 FOR UPDATE', [existingBundle.action_id])).rows[0] || null
        : null;
      const run = action?.related_automation_run_id
        ? (await client.query('SELECT * FROM automation_runs WHERE id = $1 FOR UPDATE', [action.related_automation_run_id])).rows[0] || null
        : existingBundle.action_id
          ? (await client.query('SELECT * FROM automation_runs WHERE action_id = $1 FOR UPDATE', [existingBundle.action_id])).rows[0] || null
          : null;
      const bundle = await this.findBundleForUpdate(client, bundleId, taskId);
      if (!bundle) {
        const error = new Error('Evidence bundle not found');
        error.status = 404;
        throw error;
      }
      const taskResult = await client.query('SELECT * FROM tasks WHERE id = $1 FOR UPDATE', [bundle.task_id]);
      if (!taskResult.rows[0]) {
        const error = new Error('Task not found');
        error.status = 404;
        throw error;
      }
      await this.assertBundleMutationAuthority(client, bundle, authContext, 'cancel');
      if (terminalBundleStatuses.has(bundle.status) || bundle.status === 'validation_passed' || taskResult.rows[0].submitted) {
        const error = new Error(`Evidence bundle cannot be cancelled from status ${bundle.status}.`);
        error.status = 409;
        error.code = 'EVIDENCE_CANCEL_TERMINAL';
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
      if (run) {
        await client.query(
          `UPDATE automation_runs
           SET status = 'cancelled',
               cancelled_at = NOW(),
               claim_token = NULL,
               lease_expires_at = NULL,
               updated_at = NOW()
           WHERE id = $1
             AND status IN ('queued', 'running', 'retry_wait', 'blocked')`,
          [run.id]
        );
        await client.query(
          `INSERT INTO automation_logs (run_id, level, message, payload)
           VALUES ($1, 'warn', 'Evidence validation run cancelled with its bundle.', $2::jsonb)`,
          [run.id, JSON.stringify({ taskId: bundle.task_id, bundleId: bundle.id, reason: reason || null })]
        );
      }
      if (updated.action_id) {
        await client.query(
          `UPDATE api_actions
           SET status = 'cancelled',
               cancelled_at = NOW()
           WHERE id = $1
             AND status IN ('previewed', 'confirmed')`,
          [updated.action_id]
        );
        await client.query(
          `INSERT INTO api_action_events (action_id, event_type, actor_user_id, payload)
           VALUES ($1, 'evidence.cancelled', $2, $3::jsonb)`,
          [updated.action_id, authContext.actorUserId || null, JSON.stringify({ bundleId: bundle.id, runId: run?.id || null, reason: reason || null })]
        );
      }
      await client.query(
        `UPDATE task_evidence_fetches
         SET status = 'cancelled',
             error_code = 'EVIDENCE_BUNDLE_CANCELLED',
             error_message = 'Evidence bundle was cancelled before fetch finalization.',
             completed_at = NOW()
         WHERE bundle_id = $1
           AND status = 'pending'`,
        [bundle.id]
      );
      await client.query('COMMIT');
      return this.hydrateBundle(updated.id, authContext);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async createSupersedingBundle({ taskId, bundleId, authContext, reflection = '', summary = '' }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const oldBundle = await this.findBundleForUpdate(client, bundleId, taskId);
      if (!oldBundle) {
        const error = new Error('Evidence bundle not found');
        error.status = 404;
        throw error;
      }
      if (!['needs_more_evidence', 'manual_review_required'].includes(oldBundle.status)) {
        const error = new Error('Only bundles that need more evidence or manual review can be superseded.');
        error.status = 409;
        error.code = 'EVIDENCE_SUPERSEDE_NOT_ALLOWED';
        throw error;
      }
      await this.assertBundleMutationAuthority(client, oldBundle, authContext, 'supersede');
      await client.query('SELECT id FROM tasks WHERE id = $1 FOR UPDATE', [oldBundle.task_id]);
      const existing = await this.findActiveDraft(client, oldBundle.task_id, authContext.actorUserId);
      if (existing) {
        await client.query('COMMIT');
        return this.hydrateBundle(existing.id, authContext);
      }
      if (oldBundle.action_id) {
        await client.query(
          `UPDATE api_actions
           SET status = 'cancelled',
               cancelled_at = COALESCE(cancelled_at, NOW())
           WHERE id = $1
             AND status IN ('previewed', 'confirmed')`,
          [oldBundle.action_id]
        );
      }
      const version = (await client.query(
        `SELECT COALESCE(MAX(version), 0)::int + 1 AS next_version
         FROM task_evidence_bundles
         WHERE task_id = $1
           AND actor_user_id = $2`,
        [oldBundle.task_id, authContext.actorUserId]
      )).rows[0]?.next_version || Number(oldBundle.version || 0) + 1;
      const created = (await client.query(
        `INSERT INTO task_evidence_bundles (
           task_id, actor_user_id, source_kind, status, version, reflection, summary, supersedes_bundle_id
         )
         VALUES ($1, $2, 'human', 'draft', $3, $4, $5, $6)
         RETURNING *`,
        [
          oldBundle.task_id,
          authContext.actorUserId,
          version,
          compactText(reflection, 8000) || null,
          compactText(summary, 1200) || null,
          oldBundle.id
        ]
      )).rows[0];
      await client.query(
        `INSERT INTO api_action_events (action_id, event_type, actor_user_id, payload)
         SELECT action_id, 'evidence.superseded', $2, $3::jsonb
         FROM task_evidence_bundles
         WHERE id = $1
           AND action_id IS NOT NULL`,
        [oldBundle.id, authContext.actorUserId || null, JSON.stringify({ oldBundleId: oldBundle.id, newBundleId: created.id })]
      );
      await client.query('COMMIT');
      return this.hydrateBundle(created.id, authContext);
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
    await this.assertBundleMutationAuthority(client, bundle, { actorUserId, isServiceActor, scopes, roles }, 'confirm');
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
    const integrity = await this.verifyFrozenManifest(pool, bundle, task);
    if (!integrity.ok) {
      const integrityStatus = integrity.status || 'validation_failed';
      const integrityVerdict = integrityStatus === 'manual_review_required' ? 'manual_review_required' : 'failed';
      const requirementResults = [{
        requirementId: 'evidence-integrity',
        description: 'Frozen evidence manifest integrity',
        verdict: integrityVerdict,
        evidenceItemIds: [],
        checks: ['manifest_integrity']
      }];
      return {
        status: integrityStatus,
        taskId: task.id,
        bundleId: bundle.id,
        bundleUuid: bundle.bundle_uuid,
        provider: 'deterministic',
        passed: false,
        requirementResults,
        findings: [integrity.finding],
        summary: integrity.finding.message,
        completedAt: nowIso()
      };
    }
    const items = integrity.items;
    const normalizedRequirements = integrity.requirements.map(requirement => ({
      ...requirement,
      acceptedEvidenceTypes: requirement.acceptedEvidenceTypes || requirement.proofTypes || requirement.evidenceTypes || [],
      checks: requirement.checks || ['evidence_present'],
      minimumEvidenceItems: Math.max(Number(requirement.minimumEvidenceItems || 1), 1),
      semanticReview: requirement.semanticReview || 'never'
    }));
    const requirementResults = [];
    const findings = [];
    for (const requirement of normalizedRequirements) {
      const result = await this.evaluateRequirement({ requirement, task, bundle, items, requirementCount: normalizedRequirements.length });
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
    if (bundle.status === 'cancelled') {
      const error = new Error('Evidence bundle was cancelled before validation finalization.');
      error.status = 409;
      error.code = 'EVIDENCE_VALIDATION_CANCELLED';
      throw error;
    }
    if (bundle.action_id && Number(bundle.action_id) !== Number(run.action_id)) {
      const error = new Error('Evidence bundle/action relationship changed before finalization.');
      error.status = 409;
      error.code = 'EVIDENCE_RELATIONSHIP_CHANGED';
      throw error;
    }
    const action = run.action_id
      ? (await client.query('SELECT * FROM api_actions WHERE id = $1 FOR UPDATE', [run.action_id])).rows[0] || null
      : null;
    if (run.status === 'cancelled' || run.cancelled_at || action?.status === 'cancelled') {
      const error = new Error('Evidence validation action or run was cancelled before finalization.');
      error.status = 409;
      error.code = 'EVIDENCE_VALIDATION_CANCELLED';
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
    await client.query('SELECT id FROM tasks WHERE id = $1 FOR UPDATE', [task.id]);
    const requirements = TaskEvidenceRequirementService.normalizeForTask(task);
    const requirementSnapshot = TaskEvidenceRequirementService.summarize(requirements);
    const reportRequirementIds = requirementSnapshot
      .filter(requirement => {
        const accepted = new Set(asArray(requirement.acceptedEvidenceTypes || requirement.proofTypes).map(String));
        const checks = new Set(asArray(requirement.checks).map(String));
        return accepted.has('automation_report')
          || checks.has('report_status_checks_passed')
          || checks.has('report_belongs_to_task')
          || checks.has('resolved_commit_present');
      })
      .map(requirement => requirement.requirementId);

    let bundle = (await client.query(
      `INSERT INTO task_evidence_bundles (
         task_id, actor_user_id, source_kind, status, version, reflection, summary,
         requirement_snapshot, validation_policy_snapshot, action_id, source_automation_run_id, submitted_at
       )
       VALUES (
         $1, $2, 'automation', 'validating',
         COALESCE((SELECT MAX(version) + 1 FROM task_evidence_bundles WHERE task_id = $1 AND actor_user_id = $2), 1),
         $3, $4, $5::jsonb, $6::jsonb, $7, $8, NOW()
       )
       ON CONFLICT (source_automation_run_id) WHERE source_automation_run_id IS NOT NULL
       DO UPDATE SET updated_at = task_evidence_bundles.updated_at
       RETURNING *`,
      [
        task.id,
        actorUserId || null,
        `Automated quality-check report from run ${run.run_uuid || run.id}: ${result.summary || 'Quality checks passed.'}`,
        result.summary || 'Quality checks passed.',
        JSON.stringify(requirementSnapshot),
        JSON.stringify({ generatedFrom: 'run_quality_checks', automationRunId: run.id, capturedAt: nowIso() }),
        run.action_id || null,
        run.id
      ]
    )).rows[0];

    const metadata = {
      report: result,
      taskId: task.id,
      runId: run.id,
      runUuid: run.run_uuid,
      artifactUri: proofUri
    };
    let reportItem = (await client.query(
      `SELECT *
       FROM task_evidence_items
       WHERE bundle_id = $1
         AND evidence_type = 'automation_report'
       ORDER BY id ASC
       LIMIT 1
       FOR UPDATE`,
      [bundle.id]
    )).rows[0] || null;
    if (!reportItem) {
      reportItem = (await client.query(
      `INSERT INTO task_evidence_items (
         bundle_id, task_id, actor_user_id, evidence_type, requirement_ids,
         title, artifact_uri, content_sha256, metadata
       )
       VALUES ($1, $2, $3, 'automation_report', $4::text[], $5, $6, $7, $8::jsonb)
       RETURNING *`,
      [
        bundle.id,
        task.id,
        actorUserId || null,
        reportRequirementIds,
        'Quality-check automation report',
        proofUri,
        jsonHash(metadata),
        JSON.stringify(metadata)
      ]
      )).rows[0];
    }

    const items = await this.loadItemsForBundle(client, bundle.id);
    const validationPolicySnapshot = {
      generatedFrom: 'run_quality_checks',
      automationRunId: run.id,
      policyVersion: 'submission-validation-v2',
      capturedAt: nowIso()
    };
    const frozenManifest = await this.buildFrozenManifest(client, bundle, items, requirements, {
      task,
      validationPolicySnapshot,
      persistItemDigests: true
    });
    bundle = (await client.query(
      `UPDATE task_evidence_bundles
       SET status = 'validating',
           requirement_snapshot = $2::jsonb,
           validation_policy_snapshot = $3::jsonb,
           frozen_manifest = $4::jsonb,
           manifest_sha256 = $5,
           frozen_at = COALESCE(frozen_at, NOW()),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [
        bundle.id,
        JSON.stringify(requirementSnapshot),
        JSON.stringify(validationPolicySnapshot),
        JSON.stringify(frozenManifest),
        frozenManifest.manifestSha256
      ]
    )).rows[0];

    const integrity = await this.verifyFrozenManifest(client, bundle, task);
    const requirementResults = [];
    const findings = [];
    if (!integrity.ok) {
      const integrityVerdict = integrity.status === 'manual_review_required' ? 'manual_review_required' : 'failed';
      requirementResults.push({
        requirementId: 'evidence-integrity',
        description: 'Frozen evidence manifest integrity',
        verdict: integrityVerdict,
        evidenceItemIds: [],
        checks: ['manifest_integrity']
      });
      findings.push(integrity.finding);
    } else {
      for (const requirement of requirementSnapshot) {
        const evaluated = await this.evaluateRequirement({
          requirement,
          task,
          bundle,
          items: integrity.items,
          requirementCount: requirementSnapshot.length
        });
        requirementResults.push(evaluated.requirementResult);
        findings.push(...evaluated.findings);
      }
      if (reportRequirementIds.length > 0) {
        findings.push({
          requirementId: reportRequirementIds[0],
          severity: 'info',
          code: 'AUTOMATION_REPORT_ATTACHED',
          message: 'Passing quality-check report was attached as canonical evidence.',
          evidenceItemIds: [reportItem.id]
        });
      }
    }
    const status = this.overallValidationStatus(requirementResults);
    const validationResult = {
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
    const validation = await this.insertValidationResult(client, {
      bundle,
      task,
      run,
      status,
      result: validationResult,
      provider: 'deterministic'
    });
    if (status === 'validation_passed') {
      await this.bridgeTaskToReview(client, { task, bundle, run, result: validationResult });
    } else if (status === 'manual_review_required') {
      await client.query(
        `INSERT INTO task_validation_reviews (
           validation_result_id, bundle_id, task_id, requested_by, status, reason
         )
         VALUES ($1, $2, $3, $4, 'pending', $5)
         ON CONFLICT DO NOTHING`,
        [validation.id, bundle.id, task.id, actorUserId || null, validationResult.summary]
      );
    }
    await client.query(
      `UPDATE task_evidence_bundles
       SET status = $2,
           validated_at = NOW(),
           updated_at = NOW()
       WHERE id = $1`,
      [bundle.id, status]
    );
    return {
      ...result,
      evidenceBundleId: bundle.id,
      evidenceBundleUuid: bundle.bundle_uuid,
      validationResultId: validation.id,
      validationStatus: status,
      submittedTask: status === 'validation_passed'
    };
  }

  async createItemWithClient(client, bundle, item, requirements = []) {
    const evidenceType = String(item.evidenceType || item.evidence_type || 'text');
    if (!canonicalEvidenceTypes.has(evidenceType)) {
      const error = new Error(`Evidence type ${evidenceType} is not supported.`);
      error.status = 422;
      error.code = 'EVIDENCE_TYPE_UNSUPPORTED';
      throw error;
    }
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

    if (['text', 'reflection', 'attestation', 'receipt'].includes(evidenceType)) {
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
        const decoded = decodeStrictBase64(base64);
        const inspected = await inspectBinary({
          buffer: decoded,
          claimedMediaType: mediaType,
          sourceKind: 'upload'
        });
        if (evidenceType === 'image' && !String(inspected.mediaType).startsWith('image/')) {
          const error = new Error(`Image evidence cannot use ${inspected.mediaType}.`);
          error.status = 415;
          error.code = 'EVIDENCE_MEDIA_TYPE_MISMATCH';
          throw error;
        }
        if (evidenceType === 'document' && !['application/pdf', 'text/plain'].includes(inspected.mediaType)) {
          const error = new Error(`Document evidence cannot use ${inspected.mediaType}.`);
          error.status = 415;
          error.code = 'EVIDENCE_MEDIA_TYPE_MISMATCH';
          throw error;
        }
        await EvidenceArtifactStore.assertBundleSize(bundle.id, inspected.byteSize, client);
        const blob = await EvidenceArtifactStore.putBuffer({
          buffer: inspected.buffer,
          mediaType: inspected.mediaType,
          metadata: { metadataPolicy: inspected.metadataPolicy },
          sanitizerVersion: inspected.sanitizerVersion,
          client
        });
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
      const resolved = await EvidenceArtifactReferenceResolver.resolve({
        artifactUri,
        taskId: bundle.task_id,
        authContext: {
          actorUserId: bundle.actor_user_id,
          isServiceActor: bundle.source_kind === 'automation',
          scopes: bundle.source_kind === 'automation' ? ['evidence:service'] : []
        },
        client
      });
      contentSha256 = resolved.contentSha256;
      byteSize = resolved.byteSize;
      Object.assign(metadata, { artifact: resolved.metadata });
    } else if (evidenceType === 'automation_report') {
      contentSha256 = contentSha256 || jsonHash(metadata);
      byteSize = byteSize || Buffer.byteLength(JSON.stringify(metadata), 'utf8');
    } else if (evidenceType === 'url_snapshot') {
      if (!blobStorageKey || !sourceUrl) {
        const error = new Error('URL snapshot evidence must be created through fetch-url.');
        error.status = 400;
        throw error;
      }
    } else if (['repository_commit', 'pull_request', 'command_result'].includes(evidenceType)) {
      const payload = {
        textContent: compactText(textContent || '', 20000) || null,
        sourceUrl,
        artifactUri,
        metadata
      };
      if (!payload.textContent && !payload.sourceUrl && !payload.artifactUri && Object.keys(metadata || {}).length === 0) {
        const error = new Error(`${evidenceType} evidence requires structured content, URL, artifact URI, or metadata.`);
        error.status = 400;
        throw error;
      }
      textContent = payload.textContent;
      contentSha256 = jsonHash(payload);
      byteSize = Buffer.byteLength(JSON.stringify(payload), 'utf8');
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

  async evaluateRequirement({ requirement, task, bundle, items, requirementCount = 1 }) {
    const accepted = new Set(asArray(requirement.acceptedEvidenceTypes).map(String));
    const matchingItems = items.filter(item => {
      const requirementIds = asArray(item.requirement_ids);
      const matchesRequirement = requirementIds.length === 0
        ? requirementCount <= 1
        : requirementIds.includes(requirement.requirementId);
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
    const unsupportedChecks = checks.filter(check => !deterministicChecks.has(String(check)));
    if (unsupportedChecks.length > 0) {
      verdict = 'manual_review_required';
      findings.push({
        requirementId: requirement.requirementId,
        severity: 'high',
        code: 'VALIDATION_CHECK_UNSUPPORTED',
        message: `Unsupported deterministic validation check(s): ${unsupportedChecks.join(', ')}.`,
        evidenceItemIds: matchingItems.map(item => item.id)
      });
    }
    const meaningfulChecks = checks.filter(check => check !== 'evidence_present');
    if (meaningfulChecks.length === 0 && String(requirement.semanticReview || 'never') === 'never') {
      verdict = 'manual_review_required';
      findings.push({
        requirementId: requirement.requirementId,
        severity: 'medium',
        code: 'VALIDATION_REQUIREMENT_TOO_VAGUE',
        message: 'This validation requirement is too vague to pass deterministically without semantic or manual review.',
        evidenceItemIds: matchingItems.map(item => item.id)
      });
    }
    for (const check of checks) {
      if (!deterministicChecks.has(String(check)) || check === 'evidence_present') {
        continue;
      }
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
      } else if (check === 'report_status_checks_passed') {
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
      } else if (check === 'report_belongs_to_task') {
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
      } else if (check === 'resolved_commit_present') {
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
      } else if (check === 'distinct_evidence_items' || check === 'no_duplicate_hashes') {
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
      } else if (check === 'source_url_captured') {
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
      } else if (check === 'artifact_reference_authorized') {
        const references = matchingItems.filter(item => item.evidence_type === 'artifact_reference');
        if (references.length === 0) {
          verdict = 'insufficient_evidence';
          findings.push({
            requirementId: requirement.requirementId,
            severity: 'medium',
            code: 'ARTIFACT_REFERENCE_MISSING',
            message: 'An authorized Cerbanimo artifact reference is required.',
            evidenceItemIds: matchingItems.map(item => item.id)
          });
        }
      } else if (check === 'command_exit_zero') {
        const failing = matchingItems.filter(item => {
          const metadata = item.metadata || {};
          const exitCode = metadata.exitCode ?? metadata.exit_code ?? metadata.code;
          return item.evidence_type === 'command_result' && Number(exitCode) !== 0;
        });
        if (failing.length > 0 || matchingItems.every(item => item.evidence_type !== 'command_result')) {
          verdict = 'insufficient_evidence';
          findings.push({
            requirementId: requirement.requirementId,
            severity: 'medium',
            code: 'COMMAND_SUCCESS_MISSING',
            message: 'A command result with exit code 0 is required.',
            evidenceItemIds: matchingItems.map(item => item.id)
          });
        }
      } else if (check === 'receipt_present' && matchingItems.every(item => item.evidence_type !== 'receipt')) {
        verdict = 'insufficient_evidence';
        findings.push({
          requirementId: requirement.requirementId,
          severity: 'medium',
          code: 'RECEIPT_MISSING',
          message: 'A receipt evidence item is required.',
          evidenceItemIds: matchingItems.map(item => item.id)
        });
      } else if (check === 'attestation_present' && matchingItems.every(item => item.evidence_type !== 'attestation')) {
        verdict = 'insufficient_evidence';
        findings.push({
          requirementId: requirement.requirementId,
          severity: 'medium',
          code: 'ATTESTATION_MISSING',
          message: 'An attestation evidence item is required.',
          evidenceItemIds: matchingItems.map(item => item.id)
        });
      }
    }

    const semanticMode = String(requirement.semanticReview || 'never');
    if (semanticMode === 'configuration_error') {
      verdict = 'manual_review_required';
      findings.push({
        requirementId: requirement.requirementId,
        severity: 'high',
        code: 'SEMANTIC_REVIEW_CONFIGURATION_ERROR',
        message: 'Semantic review must be one of never, optional, or required.',
        evidenceItemIds: matchingItems.map(item => item.id)
      });
    }
    const providerConfigured = Boolean(process.env.CERBANIMO_EVIDENCE_SEMANTIC_PROVIDER);
    const shouldRunSemantic = semanticMode === 'required'
      ? verdict !== 'failed'
      : semanticMode === 'optional' && providerConfigured && verdict === 'satisfied';
    if (shouldRunSemantic) {
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
    if (findings.some(finding => ['VALIDATION_CHECK_UNSUPPORTED', 'VALIDATION_REQUIREMENT_TOO_VAGUE', 'SEMANTIC_REVIEW_CONFIGURATION_ERROR'].includes(finding.code))) {
      verdict = 'manual_review_required';
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
    const policy = await this.evidencePolicy(bundle.task_id, authContext);
    const items = await this.loadItemsForBundle(pool, bundle.id);
    const requirements = parseJsonish(bundle.requirement_snapshot, []).length
      ? parseJsonish(bundle.requirement_snapshot, [])
      : [];
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
    const canMutate = !terminalBundleStatuses.has(bundle.status)
      && actorOwnsBundle(bundle, authContext)
      && ['draft', 'previewed', 'validation_queued', 'validating'].includes(bundle.status);
    return {
      bundle: this.serializeBundle(bundle, items, { policy, authContext, requirements }),
      action: canMutate ? action : null,
      validations: validations.rows.map(validation => this.serializeValidation(validation, { policy })),
      allowedActions: {
        update: actorOwnsBundle(bundle, authContext) && bundle.status === 'draft',
        addItem: actorOwnsBundle(bundle, authContext) && bundle.status === 'draft',
        fetchUrl: actorOwnsBundle(bundle, authContext) && bundle.status === 'draft',
        preview: actorOwnsBundle(bundle, authContext) && ['draft', 'previewed'].includes(bundle.status),
        cancel: canMutate,
        confirm: Boolean(canMutate && action && action.status === 'previewed' && bundle.status === 'previewed')
      },
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

  canSerializeEvidenceContent(bundle, { policy, authContext } = {}) {
    if (policy?.basis?.serviceActor || policy?.basis?.admin) return true;
    if (actorOwnsBundle(bundle, authContext)) return true;
    if (['draft', 'previewed'].includes(bundle.status)) return false;
    return Boolean(policy?.canViewEvidenceContent?.allowed);
  }

  serializeBundle(bundle, items = [], options = {}) {
    const canViewContent = this.canSerializeEvidenceContent(bundle, options);
    const requirements = options.requirements || parseJsonish(bundle.requirement_snapshot, []);
    if (!canViewContent) {
      return {
        id: bundle.id,
        bundle_uuid: bundle.bundle_uuid,
        task_id: bundle.task_id,
        source_kind: bundle.source_kind,
        status: bundle.status,
        version: bundle.version,
        itemCount: items.length,
        validationStatus: bundle.status,
        requirementCoverage: coverageSummary(requirements, items),
        created_at: bundle.created_at,
        updated_at: bundle.updated_at
      };
    }
    return {
      id: bundle.id,
      bundle_uuid: bundle.bundle_uuid,
      task_id: bundle.task_id,
      actor_user_id: bundle.actor_user_id,
      source_kind: bundle.source_kind,
      status: bundle.status,
      version: bundle.version,
      reflection: bundle.reflection,
      summary: bundle.summary,
      requirement_snapshot: bundle.requirement_snapshot,
      supersedes_bundle_id: bundle.supersedes_bundle_id,
      manifest_sha256: bundle.manifest_sha256 ? '[redacted]' : null,
      frozen_at: bundle.frozen_at,
      submitted_at: bundle.submitted_at,
      validated_at: bundle.validated_at,
      cancelled_at: bundle.cancelled_at,
      created_at: bundle.created_at,
      updated_at: bundle.updated_at,
      actionId: actionIdFromBundle(bundle),
      itemCount: items.length,
      requirementCoverage: coverageSummary(requirements, items),
      items: items.map(item => this.serializeItem(item))
    };
  }

  serializeItem(item) {
    return {
      id: item.id,
      evidence_uuid: item.evidence_uuid,
      evidence_type: item.evidence_type,
      requirement_ids: item.requirement_ids,
      title: item.title,
      text_content: item.text_content ? compactText(item.text_content, 1000) : item.text_content,
      source_url: item.source_url,
      canonical_url: item.canonical_url,
      artifact_uri: item.artifact_uri,
      media_type: item.media_type,
      byte_size: item.byte_size,
      created_at: item.created_at
    };
  }

  serializeValidation(validation, { policy } = {}) {
    if (!policy?.canReviewValidation?.allowed) {
      return {
        id: validation.id,
        validation_uuid: validation.validation_uuid,
        bundle_id: validation.bundle_id,
        task_id: validation.task_id,
        status: validation.status,
        overall_verdict: validation.overall_verdict,
        summary: validation.summary,
        requirement_results: validation.requirement_results,
        findings: asArray(validation.findings).map(finding => ({
          requirement_id: finding.requirement_id,
          severity: finding.severity,
          code: finding.code,
          message: finding.message,
          evidence_item_count: asArray(finding.evidence_item_ids).length
        })),
        created_at: validation.created_at
      };
    }
    return validation;
  }
}

export { buildAuthoritySnapshot };
export default new TaskEvidenceService();
