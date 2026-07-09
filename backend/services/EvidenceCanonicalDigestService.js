import crypto from 'node:crypto';
import EvidenceArtifactStore from './EvidenceArtifactStore.js';
import EvidenceArtifactReferenceResolver from './EvidenceArtifactReferenceResolver.js';
import TaskEvidenceRequirementService from './TaskEvidenceRequirementService.js';

const DIGEST_VERSION = 'evidence-digest-v2';
const MANIFEST_VERSION = 'evidence-manifest-v2';

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value ?? null);
}

function sha256(value) {
  const input = Buffer.isBuffer(value) ? value : Buffer.from(typeof value === 'string' ? value : stableJson(value), 'utf8');
  return crypto.createHash('sha256').update(input).digest('hex');
}

function normalizeText(value) {
  return String(value || '').normalize('NFC').replace(/\r\n?/g, '\n');
}

function parseJsonish(value, fallback = {}) {
  if (Array.isArray(value) || (value && typeof value === 'object')) return value;
  if (typeof value !== 'string') return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function sortedRequirementIds(item) {
  return asArray(item.requirement_ids || item.requirementIds).map(String).sort();
}

function selectedFields(source, keys) {
  const output = {};
  for (const key of keys) {
    if (source?.[key] !== undefined && source?.[key] !== null) output[key] = source[key];
  }
  return output;
}

class EvidenceCanonicalDigestService {
  contentHash(buffer) {
    return sha256(buffer);
  }

  policyHash(policySnapshot) {
    return sha256(policySnapshot || {});
  }

  requirementSnapshotHash(requirements) {
    return sha256(TaskEvidenceRequirementService.summarize(requirements || []));
  }

  reflectionSha256(reflection = '') {
    return sha256({
      digestVersion: DIGEST_VERSION,
      evidenceType: 'reflection',
      normalizedUtf8: normalizeText(reflection)
    });
  }

  async digestItem({ client, item, bundle, task }) {
    const evidenceType = String(item.evidence_type || item.evidenceType || '');
    const metadata = parseJsonish(item.metadata, {});
    const requirementIds = sortedRequirementIds(item);
    const provenance = {
      digestVersion: DIGEST_VERSION,
      evidenceType,
      taskId: Number(item.task_id || bundle?.task_id || task?.id),
      requirementIds,
      title: item.title || null
    };
    let canonicalPayload;
    let contentSha256;

    if (['text', 'reflection', 'attestation', 'receipt'].includes(evidenceType)) {
      canonicalPayload = {
        evidenceType,
        normalizedUtf8: normalizeText(item.text_content || ''),
        declaration: selectedFields(metadata, ['attestor', 'attestedAt', 'receiptId', 'amount', 'currency', 'issuer'])
      };
      contentSha256 = sha256(canonicalPayload);
    } else if (['image', 'document', 'url_snapshot'].includes(evidenceType)) {
      if (!item.blob_storage_key) {
        const error = new Error(`${evidenceType} evidence is missing its sanitized blob.`);
        error.code = 'EVIDENCE_ITEM_MISSING';
        throw error;
      }
      const blob = await EvidenceArtifactStore.getByStorageKey(item.blob_storage_key, client);
      if (!blob) {
        const error = new Error('Evidence blob is missing.');
        error.code = 'EVIDENCE_ITEM_MISSING';
        throw error;
      }
      contentSha256 = sha256(blob.content);
      canonicalPayload = {
        evidenceType,
        sanitizedMediaType: blob.media_type,
        byteSize: Number(blob.byte_size || 0),
        sanitizerVersion: blob.sanitizer_version || null
      };
      if (evidenceType === 'url_snapshot') {
        const fetchRow = await this.fetchRecordForItem(client, item.id);
        provenance.sourceUrl = item.source_url || fetchRow?.requested_url || null;
        provenance.finalUrl = item.canonical_url || fetchRow?.canonical_url || null;
        provenance.responseStatus = metadata.statusCode ?? fetchRow?.response_status ?? null;
        provenance.fetchRecordId = fetchRow?.id || null;
        provenance.captureTimestamp = metadata.capturedAt || item.captured_at || fetchRow?.completed_at || null;
        provenance.sanitizationPolicyVersion = blob.sanitizer_version || metadata.metadataPolicy?.sanitizerVersion || null;
        provenance.originalResponseType = metadata.originalMediaType || metadata.metadataPolicy?.originalMediaType || null;
      }
    } else if (evidenceType === 'artifact_reference') {
      const resolved = await EvidenceArtifactReferenceResolver.resolve({
        artifactUri: item.artifact_uri,
        taskId: item.task_id || bundle?.task_id || task?.id,
        authContext: {
          actorUserId: bundle?.actor_user_id,
          isServiceActor: bundle?.source_kind === 'automation',
          scopes: bundle?.source_kind === 'automation' ? ['evidence:service'] : []
        },
        client
      });
      contentSha256 = resolved.contentSha256;
      canonicalPayload = {
        evidenceType,
        sourceArtifactType: resolved.artifactType,
        sourceId: resolved.metadata?.reportId || resolved.metadata?.runId || resolved.artifactUri,
        sourceContentHash: resolved.contentSha256,
        taskId: resolved.taskId,
        runId: resolved.metadata?.runId || null
      };
      provenance.artifactUri = item.artifact_uri;
      provenance.artifactType = resolved.artifactType;
      provenance.sourceId = canonicalPayload.sourceId;
    } else if (evidenceType === 'automation_report') {
      const report = metadata.report || metadata;
      canonicalPayload = {
        evidenceType,
        sourceRunId: metadata.runId || report.runId || null,
        sourceReportId: metadata.reportId || report.reportId || null,
        taskId: metadata.taskId || report.taskId || item.task_id || null,
        repository: report.repository || report.repo || report.repositoryUrl || null,
        resolvedCommit: report.ref || report.commit || report.resolvedCommit || null,
        checkProfile: report.checkProfile || report.profile || null,
        checkStatuses: asArray(report.checks || report.statuses).map(check => selectedFields(check, ['name', 'status', 'conclusion', 'exitCode'])),
        overallReportStatus: report.status || metadata.status || null,
        artifactUri: item.artifact_uri || metadata.artifactUri || null
      };
      contentSha256 = sha256(canonicalPayload);
    } else if (['repository_commit', 'pull_request', 'command_result'].includes(evidenceType)) {
      canonicalPayload = {
        evidenceType,
        text: normalizeText(item.text_content || ''),
        sourceUrl: item.source_url || null,
        artifactUri: item.artifact_uri || null,
        authoritativeFields: selectedFields(metadata, [
          'repository',
          'commit',
          'ref',
          'pullRequest',
          'pullRequestNumber',
          'exitCode',
          'command',
          'startedAt',
          'completedAt'
        ])
      };
      contentSha256 = sha256(canonicalPayload);
    } else {
      const error = new Error(`No canonicalizer exists for evidence type ${evidenceType}.`);
      error.code = 'EVIDENCE_CANONICALIZER_UNAVAILABLE';
      throw error;
    }

    const provenanceSha256 = sha256(provenance);
    const combinedSha256 = sha256({
      digestVersion: DIGEST_VERSION,
      evidenceType,
      contentSha256,
      provenanceSha256
    });
    return {
      digestVersion: DIGEST_VERSION,
      evidenceType,
      contentSha256,
      provenanceSha256,
      combinedSha256,
      canonicalPayload,
      provenancePayload: provenance
    };
  }

  async fetchRecordForItem(client, itemId) {
    const result = await client.query(
      `SELECT *
       FROM task_evidence_fetches
       WHERE evidence_item_id = $1
       ORDER BY completed_at DESC NULLS LAST, id DESC
       LIMIT 1`,
      [itemId]
    );
    return result.rows[0] || null;
  }

  async buildManifest({ client, bundle, items, task, requirements, validationPolicySnapshot = {}, persistItemDigests = false }) {
    const itemDigests = [];
    for (const item of asArray(items).slice().sort((a, b) => Number(a.id) - Number(b.id))) {
      const digest = await this.digestItem({ client, item, bundle, task });
      itemDigests.push({ item, digest });
      if (persistItemDigests) {
        await client.query(
          `UPDATE task_evidence_items
           SET content_sha256 = $2,
               provenance_sha256 = $3,
               combined_sha256 = $4
           WHERE id = $1`,
          [item.id, digest.contentSha256, digest.provenanceSha256, digest.combinedSha256]
        );
        item.content_sha256 = digest.contentSha256;
        item.provenance_sha256 = digest.provenanceSha256;
        item.combined_sha256 = digest.combinedSha256;
      }
    }

    const base = {
      manifestVersion: MANIFEST_VERSION,
      bundleId: Number(bundle.id),
      version: Number(bundle.version || 1),
      taskId: Number(bundle.task_id),
      requirementSnapshotHash: this.requirementSnapshotHash(requirements),
      validationPolicyHash: this.policyHash(validationPolicySnapshot),
      reflectionSha256: this.reflectionSha256(bundle.reflection || ''),
      items: itemDigests.map(({ item, digest }) => ({
        itemId: Number(item.id),
        evidenceType: digest.evidenceType,
        contentSha256: digest.contentSha256,
        provenanceSha256: digest.provenanceSha256,
        combinedSha256: digest.combinedSha256,
        requirementIds: sortedRequirementIds(item)
      }))
    };
    return {
      manifest: {
        ...base,
        manifestSha256: sha256(base)
      },
      itemDigests
    };
  }

  compareDigest(row, digest) {
    if (row.content_sha256 && row.content_sha256 !== digest.contentSha256) return 'EVIDENCE_CONTENT_HASH_MISMATCH';
    if (row.provenance_sha256 && row.provenance_sha256 !== digest.provenanceSha256) return 'EVIDENCE_PROVENANCE_HASH_MISMATCH';
    if (row.combined_sha256 && row.combined_sha256 !== digest.combinedSha256) return 'EVIDENCE_MANIFEST_MISMATCH';
    return null;
  }
}

export {
  DIGEST_VERSION,
  MANIFEST_VERSION,
  sha256 as canonicalSha256,
  stableJson
};
export default new EvidenceCanonicalDigestService();
