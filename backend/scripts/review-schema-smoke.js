import 'dotenv/config';
import process from 'node:process';
import pg from 'pg';
import appPool from '../db.js';
import { createKamiyaApiTables } from '../../models/kamiya_api.js';

const { Pool } = pg;
const connectionString = process.env.PACKET008C_POSTGRES_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('PACKET008C_POSTGRES_URL, POSTGRES_URL, or DATABASE_URL is required for review schema smoke tests.');
  process.exit(1);
}

const databaseName = new URL(connectionString).pathname.replace(/^\//, '').toLowerCase();
if (!/(test|e2e|packet008c)/.test(databaseName)) {
  console.error(`Refusing to reset schema for non-test database: ${databaseName}`);
  process.exit(1);
}

const adminPool = new Pool({ connectionString, max: 2 });

async function resetPublicSchema() {
  await adminPool.query('DROP SCHEMA IF EXISTS public CASCADE');
  await adminPool.query('CREATE SCHEMA public');
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

async function tableExists(tableName) {
  const result = await adminPool.query(
    `SELECT to_regclass($1) IS NOT NULL AS exists`,
    [`public.${tableName}`]
  );
  return Boolean(result.rows[0].exists);
}

async function columnExists(tableName, columnName) {
  const result = await adminPool.query(
    `SELECT EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = $1
         AND column_name = $2
     ) AS exists`,
    [tableName, columnName]
  );
  return Boolean(result.rows[0].exists);
}

async function indexExists(indexName) {
  const result = await adminPool.query(
    `SELECT to_regclass($1) IS NOT NULL AS exists`,
    [`public.${indexName}`]
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
    'task_evidence_access_events'
  ];
  const requiredColumns = [
    ['task_evidence_blobs', 'sanitizer_version'],
    ['task_evidence_items', 'provenance_sha256'],
    ['task_evidence_items', 'combined_sha256'],
    ['task_review_rounds', 'peer_gate_method'],
    ['task_review_rounds', 'pm_gate_method'],
    ['task_review_assignments', 'expires_at']
  ];
  const requiredIndexes = [
    'idx_task_review_one_active_round',
    'idx_task_review_one_active_assignment',
    'idx_task_review_one_terminal_decision',
    'idx_task_review_events_once',
    'idx_task_acceptance_one_round'
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

async function runCase(label, setup) {
  await setup();
  await createKamiyaApiTables();
  await assertReviewSchema(label);
  await assertAcceptedReviewInvariant(label);
  return { label, ok: true };
}

try {
  const cases = [
    await runCase('fresh', resetPublicSchema),
    await runCase('render-deploy-upgrade', createRenderDeployLikeBaseline)
  ];
  console.log(JSON.stringify({ generatedAt: new Date().toISOString(), cases, failedCount: 0 }, null, 2));
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await adminPool.end().catch(() => {});
  await appPool.end().catch(() => {});
}
