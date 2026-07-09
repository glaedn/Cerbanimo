import crypto from 'node:crypto';
import pool from '../db.js';
import TaskAccessService from './TaskAccessService.js';

function fail(message, code, status = 422) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  throw error;
}

function stableHash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value ?? null)).digest('hex');
}

function parseCerbanimoUri(uri) {
  let parsed;
  try {
    parsed = new URL(String(uri || ''));
  } catch {
    fail('Artifact reference URI is not valid.', 'EVIDENCE_ARTIFACT_UNAUTHORIZED', 422);
  }
  if (parsed.protocol !== 'cerbanimo:') {
    fail('Artifact reference must use a supported Cerbanimo artifact URI.', 'EVIDENCE_ARTIFACT_UNAUTHORIZED', 422);
  }
  const pathParts = parsed.pathname.split('/').filter(Boolean);
  return {
    host: parsed.hostname,
    pathParts
  };
}

class EvidenceArtifactReferenceResolver {
  async resolve({ artifactUri, taskId, authContext = {}, client = pool }) {
    const { host, pathParts } = parseCerbanimoUri(artifactUri);

    if (host === 'automation-runs' && pathParts.length === 2 && pathParts[1] === 'quality-check-report') {
      return this.resolveAutomationRunReport({
        runIdOrUuid: pathParts[0],
        artifactUri,
        taskId,
        authContext,
        client
      });
    }

    fail('Artifact reference scheme is not supported for evidence validation.', 'EVIDENCE_ARTIFACT_UNAUTHORIZED', 422);
  }

  async resolveAutomationRunReport({ runIdOrUuid, artifactUri, taskId, authContext, client }) {
    const result = await client.query(
      `SELECT r.id AS run_id,
              r.run_uuid,
              r.actor_user_id,
              r.status AS run_status,
              report.id AS report_id,
              report.task_id,
              report.report_type,
              report.status AS report_status,
              report.report,
              report.artifact_uri
       FROM automation_runs r
       JOIN automation_run_reports report ON report.run_id = r.id
       WHERE (r.id::text = $1 OR r.run_uuid::text = $1)
         AND report.report_type = 'quality_check'
       LIMIT 1`,
      [String(runIdOrUuid)]
    );
    const row = result.rows[0];
    if (!row) {
      fail('Artifact reference does not resolve to an existing quality-check report.', 'EVIDENCE_ARTIFACT_UNAUTHORIZED', 422);
    }
    if (Number(row.task_id) !== Number(taskId)) {
      fail('Artifact reference belongs to a different task.', 'EVIDENCE_ARTIFACT_UNAUTHORIZED', 403);
    }
    const policy = await TaskAccessService.policyForTask(row.task_id, authContext, client);
    if (!policy.canViewEvidenceContent?.allowed && !policy.canSubmitEvidence?.allowed) {
      fail('Actor is not authorized to use this artifact as evidence.', 'EVIDENCE_ARTIFACT_UNAUTHORIZED', 403);
    }
    const reportPayload = {
      reportId: row.report_id,
      runId: row.run_id,
      runUuid: row.run_uuid,
      taskId: row.task_id,
      reportType: row.report_type,
      status: row.report_status,
      report: row.report
    };
    return {
      artifactUri,
      artifactType: 'automation_quality_report',
      taskId: row.task_id,
      ownerUserId: row.actor_user_id,
      immutable: true,
      contentSha256: stableHash(reportPayload),
      byteSize: Buffer.byteLength(JSON.stringify(reportPayload), 'utf8'),
      metadata: {
        reportId: row.report_id,
        runId: row.run_id,
        runUuid: row.run_uuid,
        reportType: row.report_type,
        status: row.report_status
      }
    };
  }
}

export default new EvidenceArtifactReferenceResolver();
export { stableHash as artifactStableHash };
