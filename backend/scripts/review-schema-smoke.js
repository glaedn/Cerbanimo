import 'dotenv/config';
import process from 'node:process';
import pg from 'pg';
import appPool from '../db.js';
import { createKamiyaApiTables } from '../../models/kamiya_api.js';
import { createTaskSettlementTables } from '../../models/task_settlements.js';

const { Pool } = pg;
const connectionString = process.env.PACKET008C_POSTGRES_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL;
const isolatedSchema = process.env.PACKET008C_SCHEMA || '';

if (!connectionString) {
  console.error('PACKET008C_POSTGRES_URL, POSTGRES_URL, or DATABASE_URL is required for review schema smoke tests.');
  process.exit(1);
}

const databaseName = new URL(connectionString).pathname.replace(/^\//, '').toLowerCase();
if (isolatedSchema && !/^cerbanimo_review_test_[a-z0-9_]+$/.test(isolatedSchema)) {
  console.error(`Refusing unsafe review schema name: ${isolatedSchema}`);
  process.exit(1);
}
if (!isolatedSchema && !/(test|e2e|packet008c)/.test(databaseName)) {
  console.error(`Refusing to reset schema for non-test database: ${databaseName}`);
  process.exit(1);
}
const schemaName = isolatedSchema || 'public';
const schemaSql = `"${schemaName}"`;

const adminPool = new Pool({ connectionString, max: 2 });

async function resetPublicSchema() {
  await adminPool.query(`DROP SCHEMA IF EXISTS ${schemaSql} CASCADE`);
  await adminPool.query(`CREATE SCHEMA ${schemaSql}`);
  await adminPool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
  await adminPool.query(`
    CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      username TEXT,
      email TEXT
    );
    CREATE TABLE projects (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      creator_id INTEGER REFERENCES users(id)
    );
    CREATE TABLE tasks (
      id BIGSERIAL PRIMARY KEY,
      project_id BIGINT REFERENCES projects(id),
      creator_id INTEGER REFERENCES users(id),
      name TEXT NOT NULL DEFAULT 'Task',
      description TEXT,
      status TEXT NOT NULL DEFAULT 'submitted',
      review_policy JSONB NOT NULL DEFAULT '{}'::jsonb
    );
    CREATE TABLE skills (
      id SERIAL PRIMARY KEY,
      name TEXT,
      unlocked_users JSONB NOT NULL DEFAULT '[]'::jsonb
    );
    CREATE TABLE communities (
      id SERIAL PRIMARY KEY,
      name TEXT
    );
  `);
}

async function createRenderDeployLikeBaseline() {
  await resetPublicSchema();
  await adminPool.query(`
    CREATE TABLE api_tokens (
      id BIGSERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      token_hash TEXT UNIQUE NOT NULL,
      scopes TEXT[] NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE api_actions (
      id BIGSERIAL PRIMARY KEY,
      action_uuid UUID NOT NULL DEFAULT gen_random_uuid(),
      intent_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      preview_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      risk_level TEXT NOT NULL DEFAULT 'normal',
      status TEXT NOT NULL DEFAULT 'previewed',
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(action_uuid)
    );
    CREATE TABLE task_evidence_blobs (
      id BIGSERIAL PRIMARY KEY,
      storage_key TEXT UNIQUE NOT NULL,
      media_type TEXT NOT NULL,
      byte_size BIGINT NOT NULL,
      content_sha256 TEXT NOT NULL,
      content BYTEA NOT NULL,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

async function createLegacySettlementBaseline() {
  await resetPublicSchema();
  await createKamiyaApiTables();
  await assertAcceptedReviewInvariant('legacy-settlement-seed');
  await adminPool.query(`
    CREATE TABLE task_settlements (
      id BIGSERIAL PRIMARY KEY,
      settlement_uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
      task_id BIGINT NOT NULL,
      project_id INTEGER NOT NULL,
      acceptance_record_id BIGINT UNIQUE NOT NULL,
      review_round_id BIGINT NOT NULL,
      bundle_id BIGINT NOT NULL,
      validation_result_id BIGINT NOT NULL,
      manifest_sha256 TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      policy_version TEXT NOT NULL,
      policy_snapshot JSONB NOT NULL,
      effect_plan JSONB NOT NULL DEFAULT '{}'::jsonb,
      action_id BIGINT,
      automatic BOOLEAN NOT NULL DEFAULT FALSE,
      attempt_count INTEGER NOT NULL DEFAULT 0,
      next_retry_at TIMESTAMPTZ,
      last_error JSONB,
      started_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE task_completion_records (
      id BIGSERIAL PRIMARY KEY,
      completion_uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
      task_id BIGINT NOT NULL,
      project_id INTEGER NOT NULL,
      settlement_id BIGINT UNIQUE NOT NULL,
      acceptance_record_id BIGINT NOT NULL,
      manifest_sha256 TEXT NOT NULL,
      completed_by_user_id INTEGER,
      completed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      completion_payload JSONB NOT NULL DEFAULT '{}'::jsonb
    );
    CREATE TABLE reward_ledger_events (
      id BIGSERIAL PRIMARY KEY,
      event_uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
      settlement_id BIGINT NOT NULL,
      task_id BIGINT NOT NULL,
      project_id INTEGER NOT NULL,
      recipient_user_id INTEGER NOT NULL,
      reward_role TEXT NOT NULL,
      token_type TEXT NOT NULL,
      amount NUMERIC(36,18) NOT NULL,
      previous_balance NUMERIC(36,18) NOT NULL,
      new_balance NUMERIC(36,18) NOT NULL,
      policy_version TEXT NOT NULL,
      idempotency_key TEXT UNIQUE NOT NULL,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE skill_xp_events (
      id BIGSERIAL PRIMARY KEY,
      event_uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
      settlement_id BIGINT NOT NULL,
      task_id BIGINT NOT NULL,
      user_id INTEGER NOT NULL,
      skill_id INTEGER NOT NULL,
      xp_delta INTEGER NOT NULL,
      previous_xp INTEGER NOT NULL,
      new_xp INTEGER NOT NULL,
      previous_level INTEGER NOT NULL,
      new_level INTEGER NOT NULL,
      policy_version TEXT NOT NULL,
      idempotency_key TEXT UNIQUE NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE task_settlement_events (
      id BIGSERIAL PRIMARY KEY,
      event_uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
      settlement_id BIGINT NOT NULL,
      task_id BIGINT NOT NULL,
      project_id INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      event_key TEXT NOT NULL,
      actor_user_id INTEGER,
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (settlement_id, event_key)
    );
    CREATE TABLE task_settlement_outbox (
      id BIGSERIAL PRIMARY KEY,
      outbox_uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
      settlement_id BIGINT NOT NULL,
      event_type TEXT NOT NULL,
      event_key TEXT NOT NULL,
      destination TEXT NOT NULL,
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      status TEXT NOT NULL DEFAULT 'pending',
      attempt_count INTEGER NOT NULL DEFAULT 0,
      available_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      delivered_at TIMESTAMPTZ,
      last_error JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT task_settlement_outbox_last_error_check CHECK (last_error IS NULL OR jsonb_typeof(last_error) = 'object'),
      UNIQUE (settlement_id, event_key)
    );
  `);

  await adminPool.query(`
    INSERT INTO task_settlements (
      task_id, project_id, acceptance_record_id, review_round_id, bundle_id,
      validation_result_id, manifest_sha256, status, policy_version,
      policy_snapshot, effect_plan, next_retry_at, last_error
    )
    SELECT ar.task_id, t.project_id, ar.id, ar.review_round_id, ar.bundle_id,
           ar.validation_result_id, ar.evidence_manifest_sha256, 'retry_wait',
           'legacy-settlement-v0', '{"legacy":true}'::jsonb,
           '{"legacyEffect":true}'::jsonb, NOW(), '{"message":"legacy failure"}'::jsonb
    FROM task_acceptance_records ar
    JOIN tasks t ON t.id = ar.task_id
    WHERE ar.task_id = 1;
  `);
}

async function tableExists(tableName) {
  const result = await adminPool.query(
    `SELECT to_regclass($1) IS NOT NULL AS exists`,
    [`${schemaName}.${tableName}`]
  );
  return Boolean(result.rows[0].exists);
}

async function columnExists(tableName, columnName) {
  const result = await adminPool.query(
    `SELECT EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = $1
         AND table_name = $2
         AND column_name = $3
     ) AS exists`,
    [schemaName, tableName, columnName]
  );
  return Boolean(result.rows[0].exists);
}

async function indexExists(indexName) {
  const result = await adminPool.query(
    `SELECT to_regclass($1) IS NOT NULL AS exists`,
    [`${schemaName}.${indexName}`]
  );
  return Boolean(result.rows[0].exists);
}

async function assertReviewSchema(label) {
  const requiredTables = [
    'task_review_rounds',
    'task_review_assignments',
    'task_review_decisions',
    'task_review_events',
    'task_acceptance_records',
    'task_evidence_access_events',
    'task_settlements',
    'task_completion_records',
    'reward_ledger_events',
    'skill_xp_events',
    'domain_events'
  ];
  const requiredColumns = [
    ['task_evidence_blobs', 'sanitizer_version'],
    ['task_evidence_items', 'provenance_sha256'],
    ['task_evidence_items', 'combined_sha256'],
    ['task_review_rounds', 'peer_gate_method'],
    ['task_review_rounds', 'pm_gate_method'],
    ['task_review_assignments', 'expires_at'],
    ['task_settlements', 'idempotency_key'],
    ['task_settlements', 'result_snapshot'],
    ['task_settlements', 'next_attempt_at'],
    ['task_completion_records', 'evidence_manifest_sha256'],
    ['reward_ledger_events', 'user_id'],
    ['reward_ledger_events', 'event_key'],
    ['skill_xp_events', 'event_key']
  ];
  const requiredIndexes = [
    'idx_task_review_one_active_round',
    'idx_task_review_one_active_assignment',
    'idx_task_review_one_terminal_decision',
    'idx_task_review_events_once',
    'idx_task_acceptance_one_round',
    'idx_task_settlements_status',
    'idx_domain_events_project_cursor'
  ];

  const failures = [];
  for (const table of requiredTables) {
    if (!(await tableExists(table))) failures.push(`${label}: missing table ${table}`);
  }
  for (const [table, column] of requiredColumns) {
    if (!(await columnExists(table, column))) failures.push(`${label}: missing column ${table}.${column}`);
  }
  for (const index of requiredIndexes) {
    if (!(await indexExists(index))) failures.push(`${label}: missing index ${index}`);
  }
  if (failures.length) throw new Error(failures.join('; '));
}

async function assertAcceptedReviewInvariant(label) {
  await adminPool.query(`INSERT INTO users (id, username) VALUES (1, 'contributor'), (2, 'reviewer') ON CONFLICT DO NOTHING`);
  await adminPool.query(`INSERT INTO projects (id, name, creator_id) VALUES (1, 'Quest', 2) ON CONFLICT DO NOTHING`);
  await adminPool.query(`INSERT INTO tasks (id, project_id, creator_id, name, status) VALUES (1, 1, 1, 'Encounter', 'submitted') ON CONFLICT DO NOTHING`);
  const bundle = (await adminPool.query(
    `INSERT INTO task_evidence_bundles (task_id, actor_user_id, source_kind, status, version, frozen_manifest, manifest_sha256)
     VALUES (1, 1, 'human', 'validation_passed', 1, '{"manifestVersion":"evidence-manifest-v2"}'::jsonb, 'manifest-smoke')
     RETURNING id`
  )).rows[0];
  const validation = (await adminPool.query(
    `INSERT INTO task_validation_results (bundle_id, task_id, provider, status, overall_verdict, requirement_results)
     VALUES ($1, 1, 'deterministic', 'passed', 'passed', '[]'::jsonb)
     RETURNING id`,
    [bundle.id]
  )).rows[0];
  const round = (await adminPool.query(
    `INSERT INTO task_review_rounds (
       task_id, bundle_id, validation_result_id, submission_actor_user_id, status, stage, risk_tier,
       policy_version, policy_snapshot, evidence_manifest_sha256, peer_approvals_required,
       peer_approvals_received, peer_gate_method, pm_gate_method, accepted_at
     )
     VALUES (1, $1, $2, 1, 'accepted_pending_settlement', 'accepted', 'standard',
       'task-review-v1', '{"policyVersion":"task-review-v1"}'::jsonb, 'manifest-smoke', 3,
       3, 'human', 'human', NOW())
     RETURNING id`,
    [bundle.id, validation.id]
  )).rows[0];
  await adminPool.query(
    `INSERT INTO task_acceptance_records (
       task_id, bundle_id, validation_result_id, review_round_id,
       evidence_manifest_sha256, peer_gate_method, pm_gate_method, policy_version
     )
     VALUES (1, $1, $2, $3, 'manifest-smoke', 'human', 'human', 'task-review-v1')
     ON CONFLICT DO NOTHING`,
    [bundle.id, validation.id, round.id]
  );
  const invariant = (await adminPool.query(
    `SELECT t.status AS task_status,
            COUNT(a.*)::int AS acceptance_count
     FROM tasks t
     LEFT JOIN task_acceptance_records a ON a.task_id = t.id
     WHERE t.id = 1
     GROUP BY t.id`
  )).rows[0];
  if (invariant.task_status !== 'submitted' || Number(invariant.acceptance_count) !== 1) {
    throw new Error(`${label}: accepted review invariant failed`);
  }
}

async function assertLegacySettlementUpgrade(label) {
  const legacy = (await adminPool.query(`
    SELECT id, task_id, project_id, acceptance_record_id, review_round_id,
           idempotency_key, result_snapshot, next_attempt_at,
           last_error_message, last_error_details
    FROM task_settlements
    WHERE policy_version = 'legacy-settlement-v0'
  `)).rows[0];
  if (!legacy?.idempotency_key?.startsWith('legacy:settlement:')) {
    throw new Error(`${label}: legacy settlement idempotency key was not backfilled`);
  }
  if (legacy.result_snapshot?.legacyEffect !== true || !legacy.next_attempt_at) {
    throw new Error(`${label}: legacy result or retry state was not preserved`);
  }
  if (!legacy.last_error_message || legacy.last_error_details?.message !== 'legacy failure') {
    throw new Error(`${label}: legacy error state was not preserved`);
  }

  await adminPool.query('DELETE FROM task_settlements WHERE id = $1', [legacy.id]);
  const settlement = (await adminPool.query(`
    INSERT INTO task_settlements (
      acceptance_record_id, task_id, review_round_id, project_id, status,
      policy_version, policy_snapshot, idempotency_key
    ) VALUES ($1, $2, $3, $4, 'queued', 'task-settlement-v1', '{}'::jsonb, 'upgrade:canonical-settlement')
    RETURNING id
  `, [legacy.acceptance_record_id, legacy.task_id, legacy.review_round_id, legacy.project_id])).rows[0];

  await adminPool.query(`
    INSERT INTO task_completion_records (
      settlement_id, task_id, project_id, completed_by,
      evidence_manifest_sha256, completion_snapshot
    ) VALUES ($1, $2, $3, 1, 'upgrade-manifest', '{}'::jsonb)
  `, [settlement.id, legacy.task_id, legacy.project_id]);
  await adminPool.query(`
    INSERT INTO reward_ledger_events (
      settlement_id, task_id, user_id, reward_role, amount,
      token_type, event_key, metadata
    ) VALUES ($1, $2, 1, 'contributor', 1, 'coin', 'upgrade:reward', '{}'::jsonb)
  `, [settlement.id, legacy.task_id]);
  await adminPool.query(`
    INSERT INTO skill_xp_events (
      settlement_id, task_id, user_id, skill_id, xp_delta,
      previous_xp, new_xp, previous_level, new_level, event_key
    ) VALUES ($1, $2, 1, 1, 1, 0, 1, 1, 1, 'upgrade:xp')
  `, [settlement.id, legacy.task_id]);
  await adminPool.query(`
    INSERT INTO task_settlement_events (
      settlement_id, task_id, event_type, event_key, payload
    ) VALUES ($1, $2, 'task.completed', 'upgrade:event', '{}'::jsonb)
  `, [settlement.id, legacy.task_id]);
  await adminPool.query(`
    INSERT INTO task_settlement_outbox (
      settlement_id, event_type, event_key, payload
    ) VALUES ($1, 'task.completed', 'upgrade:outbox', '{}'::jsonb)
  `, [settlement.id]);

  const lastErrorType = (await adminPool.query(`
    SELECT data_type
    FROM information_schema.columns
    WHERE table_schema = $1 AND table_name = 'task_settlement_outbox' AND column_name = 'last_error'
  `, [schemaName])).rows[0]?.data_type;
  if (lastErrorType !== 'text') {
    throw new Error(`${label}: legacy outbox last_error was not converted to text`);
  }
}

async function runCase(label, setup, { assertAcceptance = true } = {}) {
  await setup();
  await createKamiyaApiTables();
  await createTaskSettlementTables();
  await assertReviewSchema(label);
  if (assertAcceptance) await assertAcceptedReviewInvariant(label);
  return { label, ok: true };
}

try {
  const cases = [
    await runCase('fresh', resetPublicSchema),
    await runCase('render-deploy-upgrade', createRenderDeployLikeBaseline),
    await runCase('legacy-settlement-upgrade', createLegacySettlementBaseline, { assertAcceptance: false })
  ];
  await assertLegacySettlementUpgrade('legacy-settlement-upgrade');
  console.log(JSON.stringify({ generatedAt: new Date().toISOString(), cases, failedCount: 0 }, null, 2));
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await adminPool.end().catch(() => {});
  await appPool.end().catch(() => {});
}
