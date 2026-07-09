import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import pg from 'pg';

const { Pool } = pg;

const artifactDir = path.resolve('.artifacts');
const artifactPath = path.join(artifactDir, 'review-races.json');
const connectionString = process.env.PACKET008C_POSTGRES_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('PACKET008C_POSTGRES_URL, POSTGRES_URL, or DATABASE_URL is required for live review race tests.');
  process.exit(1);
}

const schema = `review_race_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const schemaSql = `"${schema}"`;
const pool = new Pool({ connectionString, max: 12, idleTimeoutMillis: 5000, connectionTimeoutMillis: 5000 });
const deadlocks = [];

function seconds(ms) {
  return Math.max(0, Number(ms || 0) / 1000);
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function withClient(fn) {
  const client = await pool.connect();
  try {
    await client.query(`SET lock_timeout = '5s'`);
    await client.query(`SET statement_timeout = '15s'`);
    return await fn(client);
  } finally {
    client.release();
  }
}

async function tx(fn) {
  return withClient(async client => {
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      if (error?.code === '40P01') deadlocks.push(error);
      throw error;
    }
  });
}

async function setupSchema() {
  await pool.query(`CREATE SCHEMA ${schemaSql}`);
  await pool.query(`
    CREATE TABLE ${schemaSql}.review_rounds (
      id BIGSERIAL PRIMARY KEY,
      status TEXT NOT NULL,
      stage TEXT NOT NULL,
      risk_tier TEXT NOT NULL DEFAULT 'standard',
      peer_required INTEGER NOT NULL DEFAULT 3,
      peer_received INTEGER NOT NULL DEFAULT 0,
      peer_gate_method TEXT,
      pm_gate_method TEXT,
      peer_gate_events INTEGER NOT NULL DEFAULT 0,
      pm_gate_events INTEGER NOT NULL DEFAULT 0,
      accepted_at TIMESTAMPTZ,
      cancelled_at TIMESTAMPTZ,
      task_status TEXT NOT NULL DEFAULT 'submitted',
      completion_effects INTEGER NOT NULL DEFAULT 0,
      reward_effects INTEGER NOT NULL DEFAULT 0,
      dependency_effects INTEGER NOT NULL DEFAULT 0,
      story_effects INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE ${schemaSql}.assignments (
      id BIGSERIAL PRIMARY KEY,
      round_id BIGINT NOT NULL REFERENCES ${schemaSql}.review_rounds(id) ON DELETE CASCADE,
      reviewer_role TEXT NOT NULL,
      reviewer_user_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'accepted'
    );

    CREATE TABLE ${schemaSql}.decisions (
      id BIGSERIAL PRIMARY KEY,
      round_id BIGINT NOT NULL REFERENCES ${schemaSql}.review_rounds(id) ON DELETE CASCADE,
      assignment_id BIGINT NOT NULL REFERENCES ${schemaSql}.assignments(id) ON DELETE CASCADE,
      decision TEXT NOT NULL,
      decision_source TEXT NOT NULL DEFAULT 'human',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (assignment_id)
    );

    CREATE TABLE ${schemaSql}.acceptance_records (
      id BIGSERIAL PRIMARY KEY,
      round_id BIGINT NOT NULL REFERENCES ${schemaSql}.review_rounds(id) ON DELETE CASCADE,
      settlement_status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (round_id)
    );

    CREATE TABLE ${schemaSql}.evidence_bundles (
      id BIGSERIAL PRIMARY KEY,
      task_id BIGINT NOT NULL,
      actor_user_id INTEGER NOT NULL,
      status TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      supersedes_bundle_id BIGINT REFERENCES ${schemaSql}.evidence_bundles(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE UNIQUE INDEX evidence_one_active_draft
      ON ${schemaSql}.evidence_bundles(task_id, actor_user_id)
      WHERE status = 'draft';
  `);
}

async function createRound({ status = 'peer_review_open', stage = 'peer_review', riskTier = 'standard', peerRequired = 3 } = {}) {
  const result = await pool.query(
    `INSERT INTO ${schemaSql}.review_rounds (status, stage, risk_tier, peer_required)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [status, stage, riskTier, peerRequired]
  );
  return Number(result.rows[0].id);
}

async function createAssignment(roundId, role, reviewerUserId) {
  const result = await pool.query(
    `INSERT INTO ${schemaSql}.assignments (round_id, reviewer_role, reviewer_user_id)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [roundId, role, reviewerUserId]
  );
  return Number(result.rows[0].id);
}

async function seedApproval(roundId, assignmentId) {
  await pool.query(
    `INSERT INTO ${schemaSql}.decisions (round_id, assignment_id, decision)
     VALUES ($1, $2, 'approve')`,
    [roundId, assignmentId]
  );
}

async function lockRound(client, roundId) {
  return (await client.query(
    `SELECT * FROM ${schemaSql}.review_rounds WHERE id = $1 FOR UPDATE`,
    [roundId]
  )).rows[0];
}

async function insertDecision(client, roundId, assignmentId, decision) {
  const inserted = (await client.query(
    `INSERT INTO ${schemaSql}.decisions (round_id, assignment_id, decision)
     VALUES ($1, $2, $3)
     ON CONFLICT (assignment_id) DO NOTHING
     RETURNING id`,
    [roundId, assignmentId, decision]
  )).rowCount;
  return inserted === 1;
}

async function approvalCount(client, roundId) {
  return Number((await client.query(
    `SELECT COUNT(*)::int AS count
     FROM ${schemaSql}.decisions d
     JOIN ${schemaSql}.assignments a ON a.id = d.assignment_id
     WHERE d.round_id = $1
       AND a.reviewer_role = 'peer_reviewer'
       AND d.decision = 'approve'
       AND d.decision_source = 'human'`,
    [roundId]
  )).rows[0].count);
}

async function peerBless(roundId, assignmentId, holdMs = 0) {
  return tx(async client => {
    const round = await lockRound(client, roundId);
    if (round.status !== 'peer_review_open') return { winner: false, reason: 'stale_peer_round' };
    if (holdMs) await client.query('SELECT pg_sleep($1)', [seconds(holdMs)]);
    await insertDecision(client, roundId, assignmentId, 'approve');
    const approvals = await approvalCount(client, roundId);
    if (approvals >= Number(round.peer_required) && !round.peer_gate_method) {
      await client.query(
        `UPDATE ${schemaSql}.review_rounds
         SET status = 'pm_review_open',
             stage = 'pm_review',
             peer_received = $2,
             peer_gate_method = 'human',
             peer_gate_events = peer_gate_events + 1,
             updated_at = NOW()
         WHERE id = $1`,
        [roundId, approvals]
      );
      return { winner: true, gate: 'human' };
    }
    await client.query(`UPDATE ${schemaSql}.review_rounds SET peer_received = $2 WHERE id = $1`, [roundId, approvals]);
    return { winner: true, gate: null };
  });
}

async function peerDeadline(roundId, holdMs = 0) {
  return tx(async client => {
    const round = await lockRound(client, roundId);
    if (round.status !== 'peer_review_open') return { advanced: false, stale: true };
    if (holdMs) await client.query('SELECT pg_sleep($1)', [seconds(holdMs)]);
    const objections = Number((await client.query(
      `SELECT COUNT(*)::int AS count FROM ${schemaSql}.decisions WHERE round_id = $1 AND decision IN ('request_changes', 'reject')`,
      [roundId]
    )).rows[0].count);
    if (objections > 0 || round.risk_tier !== 'standard') return { advanced: false, reason: 'blocked' };
    const approvals = await approvalCount(client, roundId);
    await client.query(
      `UPDATE ${schemaSql}.review_rounds
       SET status = 'pm_review_open',
           stage = 'pm_review',
           peer_received = $2,
           peer_gate_method = 'policy_timeout',
           peer_gate_events = peer_gate_events + 1,
           updated_at = NOW()
       WHERE id = $1`,
      [roundId, approvals]
    );
    return { advanced: true };
  });
}

async function acceptRound(client, roundId, method) {
  const updated = (await client.query(
    `UPDATE ${schemaSql}.review_rounds
     SET status = 'accepted_pending_settlement',
         stage = 'accepted',
         pm_gate_method = COALESCE(pm_gate_method, $2),
         pm_gate_events = CASE WHEN pm_gate_method IS NULL THEN pm_gate_events + 1 ELSE pm_gate_events END,
         accepted_at = COALESCE(accepted_at, NOW()),
         updated_at = NOW()
     WHERE id = $1
       AND status = 'pm_review_open'
     RETURNING id`,
    [roundId, method]
  )).rowCount;
  if (!updated) return { accepted: false, stale: true };
  await client.query(
    `INSERT INTO ${schemaSql}.acceptance_records (round_id)
     VALUES ($1)
     ON CONFLICT DO NOTHING`,
    [roundId]
  );
  return { accepted: true };
}

async function pmSeal(roundId, assignmentId, holdMs = 0) {
  return tx(async client => {
    const round = await lockRound(client, roundId);
    if (round.status !== 'pm_review_open') return { accepted: false, stale: true };
    if (holdMs) await client.query('SELECT pg_sleep($1)', [seconds(holdMs)]);
    await insertDecision(client, roundId, assignmentId, 'approve');
    return acceptRound(client, roundId, 'human');
  });
}

async function pmDeadline(roundId, holdMs = 0) {
  return tx(async client => {
    const round = await lockRound(client, roundId);
    if (round.status !== 'pm_review_open') return { accepted: false, stale: true };
    if (holdMs) await client.query('SELECT pg_sleep($1)', [seconds(holdMs)]);
    const objections = Number((await client.query(
      `SELECT COUNT(*)::int AS count FROM ${schemaSql}.decisions WHERE round_id = $1 AND decision IN ('request_changes', 'reject')`,
      [roundId]
    )).rows[0].count);
    if (objections > 0 || round.risk_tier !== 'standard' || !round.peer_gate_method) {
      return { accepted: false, reason: 'blocked' };
    }
    return acceptRound(client, roundId, 'policy_timeout');
  });
}

async function requestChanges(roundId, assignmentId, holdMs = 0) {
  return tx(async client => {
    const round = await lockRound(client, roundId);
    if (!['peer_review_open', 'pm_review_open'].includes(round.status)) return { changed: false, stale: true };
    if (holdMs) await client.query('SELECT pg_sleep($1)', [seconds(holdMs)]);
    await insertDecision(client, roundId, assignmentId, 'request_changes');
    await client.query(
      `UPDATE ${schemaSql}.review_rounds
       SET status = CASE WHEN $2 = 'peer_review' THEN 'peer_changes_requested' ELSE 'pm_changes_requested' END,
           updated_at = NOW()
       WHERE id = $1`,
      [roundId, round.stage]
    );
    return { changed: true };
  });
}

async function rejectRound(roundId, assignmentId, holdMs = 0) {
  return tx(async client => {
    const round = await lockRound(client, roundId);
    if (['rejected', 'cancelled', 'accepted_pending_settlement'].includes(round.status)) return { rejected: false, stale: true };
    if (holdMs) await client.query('SELECT pg_sleep($1)', [seconds(holdMs)]);
    await insertDecision(client, roundId, assignmentId, 'reject');
    await client.query(
      `UPDATE ${schemaSql}.review_rounds
       SET status = 'rejected', stage = 'closed', updated_at = NOW()
       WHERE id = $1`,
      [roundId]
    );
    return { rejected: true };
  });
}

async function cancelRound(roundId, holdMs = 0) {
  return tx(async client => {
    const round = await lockRound(client, roundId);
    if (['accepted_pending_settlement', 'rejected'].includes(round.status)) return { cancelled: false, conflict: true };
    if (holdMs) await client.query('SELECT pg_sleep($1)', [seconds(holdMs)]);
    await client.query(
      `UPDATE ${schemaSql}.review_rounds
       SET status = 'cancelled', stage = 'closed', cancelled_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [roundId]
    );
    return { cancelled: true };
  });
}

async function manualValidationAccept(roundId, assignmentId, holdMs = 0) {
  return tx(async client => {
    const round = await lockRound(client, roundId);
    if (round.status !== 'awaiting_validation_review') return { accepted: false, conflict: true };
    if (holdMs) await client.query('SELECT pg_sleep($1)', [seconds(holdMs)]);
    await insertDecision(client, roundId, assignmentId, 'approve');
    await client.query(
      `UPDATE ${schemaSql}.review_rounds
       SET status = 'peer_review_open', stage = 'peer_review', updated_at = NOW()
       WHERE id = $1`,
      [roundId]
    );
    return { accepted: true };
  });
}

async function createSupersedingDraft(oldBundleId, holdMs = 0) {
  return tx(async client => {
    const oldBundle = (await client.query(
      `SELECT * FROM ${schemaSql}.evidence_bundles WHERE id = $1 FOR UPDATE`,
      [oldBundleId]
    )).rows[0];
    if (!['needs_more_evidence', 'manual_review_required'].includes(oldBundle.status)) return { created: false, conflict: true };
    if (holdMs) await client.query('SELECT pg_sleep($1)', [seconds(holdMs)]);
    const existing = (await client.query(
      `SELECT * FROM ${schemaSql}.evidence_bundles
       WHERE task_id = $1 AND actor_user_id = $2 AND status = 'draft'
       LIMIT 1`,
      [oldBundle.task_id, oldBundle.actor_user_id]
    )).rows[0];
    if (existing) return { created: false, existingId: Number(existing.id) };
    const version = Number((await client.query(
      `SELECT COALESCE(MAX(version), 0)::int + 1 AS next_version
       FROM ${schemaSql}.evidence_bundles
       WHERE task_id = $1 AND actor_user_id = $2`,
      [oldBundle.task_id, oldBundle.actor_user_id]
    )).rows[0].next_version);
    const created = (await client.query(
      `INSERT INTO ${schemaSql}.evidence_bundles (task_id, actor_user_id, status, version, supersedes_bundle_id)
       VALUES ($1, $2, 'draft', $3, $4)
       RETURNING id`,
      [oldBundle.task_id, oldBundle.actor_user_id, version, oldBundle.id]
    )).rows[0];
    return { created: true, id: Number(created.id) };
  });
}

async function runPair(first, second, secondDelay = 25) {
  const firstPromise = first();
  await delay(secondDelay);
  const secondPromise = second();
  const settled = await Promise.allSettled([firstPromise, secondPromise]);
  const errors = settled.filter(item => item.status === 'rejected').map(item => item.reason);
  for (const error of errors) {
    if (error?.code === '40P01') deadlocks.push(error);
  }
  return settled;
}

async function roundSummary(roundId) {
  return (await pool.query(
    `SELECT r.*,
            (SELECT COUNT(*)::int FROM ${schemaSql}.decisions WHERE round_id = r.id) AS decisions,
            (SELECT COUNT(*)::int FROM ${schemaSql}.acceptance_records WHERE round_id = r.id) AS acceptances
     FROM ${schemaSql}.review_rounds r
     WHERE r.id = $1`,
    [roundId]
  )).rows[0];
}

async function caseManualValidationDecisionVersusCancellation() {
  const roundId = await createRound({ status: 'awaiting_validation_review', stage: 'validation_review' });
  const assignmentId = await createAssignment(roundId, 'validation_reviewer', 10);
  await runPair(() => cancelRound(roundId, 100), () => manualValidationAccept(roundId, assignmentId));
  const summary = await roundSummary(roundId);
  return {
    caseId: 'manual-validation-decision-versus-cancellation',
    ok: summary.status === 'cancelled' && Number(summary.decisions) === 0 && Number(summary.acceptances) === 0,
    detail: summary
  };
}

async function casePeerDecisionVersusPeerDeadline() {
  const roundId = await createRound();
  const assignments = await Promise.all([1, 2, 3].map(id => createAssignment(roundId, 'peer_reviewer', id)));
  await seedApproval(roundId, assignments[0]);
  await seedApproval(roundId, assignments[1]);
  await runPair(() => peerBless(roundId, assignments[2], 100), () => peerDeadline(roundId));
  const summary = await roundSummary(roundId);
  return {
    caseId: 'peer-decision-versus-peer-deadline',
    ok: summary.status === 'pm_review_open' && summary.peer_gate_method === 'human' && Number(summary.peer_gate_events) === 1 && Number(summary.acceptances) === 0,
    detail: summary
  };
}

async function casePmSealVersusPmDeadline() {
  const roundId = await createRound({ status: 'pm_review_open', stage: 'pm_review' });
  await pool.query(`UPDATE ${schemaSql}.review_rounds SET peer_gate_method = 'human' WHERE id = $1`, [roundId]);
  const assignmentId = await createAssignment(roundId, 'pm_reviewer', 20);
  await runPair(() => pmSeal(roundId, assignmentId, 100), () => pmDeadline(roundId));
  const summary = await roundSummary(roundId);
  return {
    caseId: 'pm-seal-versus-pm-deadline',
    ok: summary.status === 'accepted_pending_settlement' && summary.pm_gate_method === 'human' && Number(summary.acceptances) === 1,
    detail: summary
  };
}

async function caseRequestChangesVersusTimeoutAdvancement() {
  const roundId = await createRound();
  const assignmentId = await createAssignment(roundId, 'peer_reviewer', 30);
  await runPair(() => requestChanges(roundId, assignmentId, 100), () => peerDeadline(roundId));
  const summary = await roundSummary(roundId);
  return {
    caseId: 'request-changes-versus-timeout-advancement',
    ok: summary.status === 'peer_changes_requested' && !summary.peer_gate_method && Number(summary.peer_gate_events) === 0,
    detail: summary
  };
}

async function caseRejectionVersusAcceptanceFinalization() {
  const roundId = await createRound({ status: 'pm_review_open', stage: 'pm_review' });
  await pool.query(`UPDATE ${schemaSql}.review_rounds SET peer_gate_method = 'human' WHERE id = $1`, [roundId]);
  const rejectAssignment = await createAssignment(roundId, 'pm_reviewer', 40);
  const sealAssignment = await createAssignment(roundId, 'pm_reviewer', 41);
  await runPair(() => rejectRound(roundId, rejectAssignment, 100), () => pmSeal(roundId, sealAssignment));
  const summary = await roundSummary(roundId);
  return {
    caseId: 'rejection-versus-acceptance-finalization',
    ok: summary.status === 'rejected' && Number(summary.acceptances) === 0,
    detail: summary
  };
}

async function caseReviewCancellationVersusFinalization() {
  const roundId = await createRound({ status: 'pm_review_open', stage: 'pm_review' });
  await pool.query(`UPDATE ${schemaSql}.review_rounds SET peer_gate_method = 'human' WHERE id = $1`, [roundId]);
  const assignmentId = await createAssignment(roundId, 'pm_reviewer', 50);
  await runPair(() => cancelRound(roundId, 100), () => pmSeal(roundId, assignmentId));
  const summary = await roundSummary(roundId);
  return {
    caseId: 'review-cancellation-versus-finalization',
    ok: summary.status === 'cancelled' && Number(summary.acceptances) === 0,
    detail: summary
  };
}

async function caseConcurrentFinalBlessings() {
  const roundId = await createRound();
  const assignments = await Promise.all([1, 2, 3, 4].map(id => createAssignment(roundId, 'peer_reviewer', id + 60)));
  await seedApproval(roundId, assignments[0]);
  await seedApproval(roundId, assignments[1]);
  await Promise.allSettled([
    peerBless(roundId, assignments[2], 100),
    peerBless(roundId, assignments[3], 100)
  ]);
  const summary = await roundSummary(roundId);
  return {
    caseId: 'concurrent-final-blessings',
    ok: summary.status === 'pm_review_open' && Number(summary.peer_gate_events) === 1 && Number(summary.acceptances) === 0,
    detail: summary
  };
}

async function caseConcurrentSupersedingEvidenceRounds() {
  const oldBundle = (await pool.query(
    `INSERT INTO ${schemaSql}.evidence_bundles (task_id, actor_user_id, status, version)
     VALUES (9001, 77, 'needs_more_evidence', 1)
     RETURNING id`
  )).rows[0];
  await Promise.allSettled([
    createSupersedingDraft(Number(oldBundle.id), 100),
    createSupersedingDraft(Number(oldBundle.id), 100)
  ]);
  const result = await pool.query(
    `SELECT COUNT(*)::int AS active_drafts,
            COUNT(DISTINCT version)::int AS distinct_versions,
            MIN(supersedes_bundle_id)::text AS supersedes
     FROM ${schemaSql}.evidence_bundles
     WHERE task_id = 9001 AND actor_user_id = 77 AND status = 'draft'`
  );
  const summary = result.rows[0];
  return {
    caseId: 'concurrent-superseding-evidence-rounds',
    ok: Number(summary.active_drafts) === 1 && Number(summary.distinct_versions) === 1 && Number(summary.supersedes) === Number(oldBundle.id),
    detail: summary
  };
}

async function invariantSummary() {
  const rounds = await pool.query(`
    SELECT
      COALESCE(SUM(completion_effects), 0)::int AS completion_effects,
      COALESCE(SUM(reward_effects), 0)::int AS reward_effects,
      COALESCE(SUM(dependency_effects), 0)::int AS dependency_effects,
      COALESCE(SUM(story_effects), 0)::int AS story_effects,
      COALESCE(SUM(GREATEST(peer_gate_events - 1, 0)), 0)::int AS duplicate_peer_gates,
      COALESCE(SUM(GREATEST(pm_gate_events - 1, 0)), 0)::int AS duplicate_pm_gates
    FROM ${schemaSql}.review_rounds
  `);
  const acceptances = await pool.query(`
    SELECT COALESCE(SUM(GREATEST(count - 1, 0)), 0)::int AS duplicate_acceptance_records
    FROM (
      SELECT round_id, COUNT(*)::int AS count
      FROM ${schemaSql}.acceptance_records
      GROUP BY round_id
    ) grouped
  `);
  return { ...rounds.rows[0], ...acceptances.rows[0] };
}

async function run() {
  await setupSchema();
  const tests = [
    caseManualValidationDecisionVersusCancellation,
    casePeerDecisionVersusPeerDeadline,
    casePmSealVersusPmDeadline,
    caseRequestChangesVersusTimeoutAdvancement,
    caseRejectionVersusAcceptanceFinalization,
    caseReviewCancellationVersusFinalization,
    caseConcurrentFinalBlessings,
    caseConcurrentSupersedingEvidenceRounds
  ];
  const cases = [];
  for (const test of tests) {
    try {
      cases.push(await test());
    } catch (error) {
      if (error?.code === '40P01') deadlocks.push(error);
      cases.push({ caseId: test.name, ok: false, error: { code: error?.code, message: error?.message } });
    }
  }
  const invariants = await invariantSummary();
  const invariantFailures = Object.entries(invariants)
    .filter(([, value]) => Number(value) !== 0)
    .map(([key, value]) => ({ key, value: Number(value) }));
  const artifact = {
    generatedAt: new Date().toISOString(),
    dbAvailable: true,
    schema,
    skippedCount: cases.filter(item => item.skipped).length,
    deadlockCount: deadlocks.length,
    duplicateReviewGates: Number(invariants.duplicate_peer_gates) + Number(invariants.duplicate_pm_gates),
    duplicateAcceptanceRecords: Number(invariants.duplicate_acceptance_records),
    forbiddenEffects: {
      completion: Number(invariants.completion_effects),
      rewards: Number(invariants.reward_effects),
      dependencies: Number(invariants.dependency_effects),
      stories: Number(invariants.story_effects)
    },
    invariantFailures,
    cases,
    failedCount: cases.filter(item => !item.ok).length + deadlocks.length + invariantFailures.length
  };

  await fs.mkdir(artifactDir, { recursive: true });
  await fs.writeFile(artifactPath, JSON.stringify(artifact, null, 2));
  console.log(JSON.stringify(artifact, null, 2));
  if (artifact.failedCount > 0 || artifact.skippedCount > 0) process.exitCode = 1;
}

try {
  await run();
} finally {
  await pool.query(`DROP SCHEMA IF EXISTS ${schemaSql} CASCADE`).catch(() => {});
  await pool.end().catch(() => {});
}
