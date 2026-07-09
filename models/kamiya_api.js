import crypto from 'crypto';
import pool from '../backend/db.js';

const defaultPrompts = [
  {
    prompt_key: 'intent-routing',
    version: 1,
    status: 'active',
    prompt_text: 'Classify user requests into Cerbanimo function intents and identify missing inputs before any mutation is proposed.',
    schema: {
      output: {
        intent: 'string',
        confidence: 'number',
        entities: 'object',
        missingInputs: 'array',
        suggestedFunctions: 'array'
      }
    }
  },
  {
    prompt_key: 'planning-analysis',
    version: 1,
    status: 'active',
    prompt_text: 'Analyze work requests into actionable project, task, automation, and memory plans using authoritative Cerbanimo function schemas.',
    schema: {
      output: {
        summary: 'string',
        steps: 'array',
        risks: 'array',
        functions: 'array'
      }
    }
  },
  {
    prompt_key: 'function-planning',
    version: 1,
    status: 'active',
    prompt_text: 'Select Cerbanimo functions that satisfy the intent while preserving preview, confirmation, and permission requirements.',
    schema: {
      output: {
        functionCalls: 'array',
        confirmationRequired: 'boolean',
        riskLevel: 'string'
      }
    }
  }
];

export async function createKamiyaApiTables() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

    await client.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS kamiya_chats JSONB NOT NULL DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS kamiya_chat_seq INTEGER NOT NULL DEFAULT 0;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS api_tokens (
        id BIGSERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        token_hash TEXT UNIQUE NOT NULL,
        scopes TEXT[] NOT NULL DEFAULT '{}',
        client_name TEXT,
        last_used_at TIMESTAMP WITH TIME ZONE,
        expires_at TIMESTAMP WITH TIME ZONE,
        revoked_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS api_prompt_registry (
        id BIGSERIAL PRIMARY KEY,
        prompt_key TEXT NOT NULL,
        version INTEGER NOT NULL,
        prompt_text TEXT NOT NULL,
        schema JSONB DEFAULT '{}'::jsonb,
        status TEXT NOT NULL DEFAULT 'draft',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (prompt_key, version)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS api_actions (
        id BIGSERIAL PRIMARY KEY,
        action_uuid UUID NOT NULL DEFAULT gen_random_uuid(),
        intent_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        preview_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        confirmation_event JSONB,
        execution_result JSONB,
        source_client TEXT,
        actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        actor_bot_identity JSONB,
        related_project_id INTEGER,
        related_task_id INTEGER,
        related_community_id INTEGER,
        related_automation_run_id BIGINT,
        preparation_id BIGINT,
        risk_level TEXT NOT NULL DEFAULT 'normal',
        status TEXT NOT NULL DEFAULT 'previewed',
        notifications_emitted JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        confirmed_at TIMESTAMP WITH TIME ZONE,
        cancelled_at TIMESTAMP WITH TIME ZONE,
        executed_at TIMESTAMP WITH TIME ZONE,
        UNIQUE (action_uuid)
      );
    `);

    await client.query(`
      ALTER TABLE api_actions
        ADD COLUMN IF NOT EXISTS actor_bot_identity JSONB,
        ADD COLUMN IF NOT EXISTS related_project_id INTEGER,
        ADD COLUMN IF NOT EXISTS related_task_id INTEGER,
        ADD COLUMN IF NOT EXISTS related_community_id INTEGER,
        ADD COLUMN IF NOT EXISTS related_automation_run_id BIGINT,
        ADD COLUMN IF NOT EXISTS preparation_id BIGINT;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS api_action_events (
        id BIGSERIAL PRIMARY KEY,
        action_id BIGINT REFERENCES api_actions(id) ON DELETE CASCADE,
        event_type TEXT NOT NULL,
        event_key TEXT,
        actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      ALTER TABLE api_action_events
        ADD COLUMN IF NOT EXISTS event_key TEXT;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS automation_runs (
        id BIGSERIAL PRIMARY KEY,
        run_uuid UUID NOT NULL DEFAULT gen_random_uuid(),
        action_id BIGINT REFERENCES api_actions(id) ON DELETE SET NULL,
        preparation_id BIGINT,
        template_key TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'queued',
        input JSONB NOT NULL DEFAULT '{}'::jsonb,
        result JSONB,
        worker_name TEXT,
        source_client TEXT,
        actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        attempt_count INTEGER NOT NULL DEFAULT 0,
        claim_token TEXT,
        lease_expires_at TIMESTAMP WITH TIME ZONE,
        cancelled_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        started_at TIMESTAMP WITH TIME ZONE,
        completed_at TIMESTAMP WITH TIME ZONE,
        UNIQUE (run_uuid)
      );
    `);

    await client.query(`
      ALTER TABLE automation_runs
        ADD COLUMN IF NOT EXISTS preparation_id BIGINT,
        ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS claim_token TEXT,
        ADD COLUMN IF NOT EXISTS lease_expires_at TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS task_automation_preparations (
        id BIGSERIAL PRIMARY KEY,
        preparation_uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
        task_id BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        actor_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        capability_name TEXT,
        status TEXT NOT NULL DEFAULT 'draft',
        input_schema_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
        input_values JSONB NOT NULL DEFAULT '{}'::jsonb,
        validation_result JSONB,
        capability_snapshot JSONB,
        permission_snapshot JSONB,
        preview_action_id BIGINT REFERENCES api_actions(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        ready_at TIMESTAMP WITH TIME ZONE,
        consumed_at TIMESTAMP WITH TIME ZONE,
        cancelled_at TIMESTAMP WITH TIME ZONE,
        CHECK (status IN ('draft', 'invalid', 'ready', 'previewed', 'consumed', 'cancelled')),
        CHECK (jsonb_typeof(input_schema_snapshot) = 'array'),
        CHECK (jsonb_typeof(input_values) = 'object')
      );
    `);

    await client.query(`
      ALTER TABLE task_automation_preparations DROP CONSTRAINT IF EXISTS task_automation_preparations_status_check;
      ALTER TABLE task_automation_preparations ADD CONSTRAINT task_automation_preparations_status_check
        CHECK (status IN ('draft', 'invalid', 'ready', 'previewed', 'consumed', 'cancelled'));
      ALTER TABLE task_automation_preparations DROP CONSTRAINT IF EXISTS task_automation_preparations_schema_array_check;
      ALTER TABLE task_automation_preparations ADD CONSTRAINT task_automation_preparations_schema_array_check
        CHECK (jsonb_typeof(input_schema_snapshot) = 'array');
      ALTER TABLE task_automation_preparations DROP CONSTRAINT IF EXISTS task_automation_preparations_values_object_check;
      ALTER TABLE task_automation_preparations ADD CONSTRAINT task_automation_preparations_values_object_check
        CHECK (jsonb_typeof(input_values) = 'object');
    `);

    await client.query(`
      UPDATE automation_runs
      SET status = 'blocked'
      WHERE status NOT IN ('queued', 'running', 'retry_wait', 'blocked', 'failed', 'completed', 'cancelled');

      ALTER TABLE automation_runs DROP CONSTRAINT IF EXISTS automation_runs_status_check;
      ALTER TABLE automation_runs ADD CONSTRAINT automation_runs_status_check
        CHECK (status IN ('queued', 'running', 'retry_wait', 'blocked', 'failed', 'completed', 'cancelled'));

      ALTER TABLE api_actions DROP CONSTRAINT IF EXISTS api_actions_preparation_fk;
      ALTER TABLE api_actions ADD CONSTRAINT api_actions_preparation_fk
        FOREIGN KEY (preparation_id) REFERENCES task_automation_preparations(id) ON DELETE SET NULL;

      ALTER TABLE automation_runs DROP CONSTRAINT IF EXISTS automation_runs_preparation_fk;
      ALTER TABLE automation_runs ADD CONSTRAINT automation_runs_preparation_fk
        FOREIGN KEY (preparation_id) REFERENCES task_automation_preparations(id) ON DELETE SET NULL;
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_task_automation_preparations_one_active
        ON task_automation_preparations (task_id, actor_user_id, COALESCE(capability_name, ''))
        WHERE status IN ('draft', 'invalid', 'ready', 'previewed');
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS automation_logs (
        id BIGSERIAL PRIMARY KEY,
        run_id BIGINT REFERENCES automation_runs(id) ON DELETE CASCADE,
        level TEXT NOT NULL DEFAULT 'info',
        message TEXT NOT NULL,
        payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS automation_run_reports (
        id BIGSERIAL PRIMARY KEY,
        run_id BIGINT NOT NULL REFERENCES automation_runs(id) ON DELETE CASCADE,
        task_id BIGINT REFERENCES tasks(id) ON DELETE SET NULL,
        report_type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'completed',
        report JSONB NOT NULL DEFAULT '{}'::jsonb,
        artifact_uri TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (run_id, report_type)
      );
    `);

    await client.query(`
      ALTER TABLE automation_run_reports
        ADD COLUMN IF NOT EXISTS task_id BIGINT REFERENCES tasks(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'completed',
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP;

      UPDATE automation_run_reports
      SET status = COALESCE(NULLIF(status, ''), 'completed'),
          report = COALESCE(report, '{}'::jsonb),
          updated_at = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP);

      ALTER TABLE automation_run_reports DROP CONSTRAINT IF EXISTS automation_run_reports_status_check;
      ALTER TABLE automation_run_reports ADD CONSTRAINT automation_run_reports_status_check
        CHECK (status IN ('queued', 'running', 'checks_passed', 'checks_failed', 'completed', 'blocked', 'failed', 'cancelled', 'executor_failed'));
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS task_automation_submissions (
        id BIGSERIAL PRIMARY KEY,
        run_id BIGINT NOT NULL REFERENCES automation_runs(id) ON DELETE CASCADE,
        task_id BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        submitted_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        proof_uri TEXT NOT NULL,
        report JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (run_id),
        UNIQUE (task_id, proof_uri)
      );
    `);

    await client.query(`
      ALTER TABLE task_automation_submissions
        ADD COLUMN IF NOT EXISTS submitted_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS report JSONB NOT NULL DEFAULT '{}'::jsonb;
    `);

    const legacySubmissionActorColumn = await client.query(`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'task_automation_submissions'
          AND column_name = 'actor_user_id'
      ) AS exists
    `);
    if (legacySubmissionActorColumn.rows[0]?.exists) {
      await client.query(`
        UPDATE task_automation_submissions
        SET submitted_by = COALESCE(submitted_by, actor_user_id),
            report = COALESCE(report, '{}'::jsonb)
      `);
    } else {
      await client.query(`
        UPDATE task_automation_submissions
        SET report = COALESCE(report, '{}'::jsonb)
      `);
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS task_evidence_blobs (
        id BIGSERIAL PRIMARY KEY,
        storage_key TEXT UNIQUE NOT NULL,
        media_type TEXT NOT NULL,
        byte_size BIGINT NOT NULL,
        content_sha256 TEXT NOT NULL,
        content BYTEA NOT NULL,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS task_evidence_bundles (
        id BIGSERIAL PRIMARY KEY,
        bundle_uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
        task_id BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        source_kind TEXT NOT NULL DEFAULT 'human',
        status TEXT NOT NULL DEFAULT 'draft',
        version INTEGER NOT NULL DEFAULT 1,
        reflection TEXT,
        summary TEXT,
        requirement_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
        validation_policy_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
        frozen_manifest JSONB,
        manifest_sha256 TEXT,
        source_automation_run_id BIGINT REFERENCES automation_runs(id) ON DELETE SET NULL,
        action_id BIGINT REFERENCES api_actions(id) ON DELETE SET NULL,
        supersedes_bundle_id BIGINT REFERENCES task_evidence_bundles(id) ON DELETE SET NULL,
        frozen_at TIMESTAMP WITH TIME ZONE,
        submitted_at TIMESTAMP WITH TIME ZONE,
        validated_at TIMESTAMP WITH TIME ZONE,
        cancelled_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CHECK (source_kind IN ('human', 'automation', 'mixed')),
        CHECK (status IN (
          'draft',
          'previewed',
          'submitted',
          'validation_queued',
          'validating',
          'validation_passed',
          'needs_more_evidence',
          'manual_review_required',
          'validation_failed',
          'cancelled',
          'superseded'
        )),
        CHECK (jsonb_typeof(requirement_snapshot) = 'array'),
        CHECK (jsonb_typeof(validation_policy_snapshot) = 'object'),
        UNIQUE (task_id, actor_user_id, version)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS task_evidence_items (
        id BIGSERIAL PRIMARY KEY,
        evidence_uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
        bundle_id BIGINT NOT NULL REFERENCES task_evidence_bundles(id) ON DELETE CASCADE,
        task_id BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        evidence_type TEXT NOT NULL,
        requirement_ids TEXT[] NOT NULL DEFAULT '{}',
        title TEXT,
        text_content TEXT,
        source_url TEXT,
        canonical_url TEXT,
        artifact_uri TEXT,
        blob_storage_key TEXT REFERENCES task_evidence_blobs(storage_key) ON DELETE SET NULL,
        media_type TEXT,
        byte_size BIGINT,
        content_sha256 TEXT NOT NULL,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        captured_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CHECK (evidence_type IN (
          'text',
          'url_snapshot',
          'image',
          'document',
          'artifact_reference',
          'automation_report',
          'repository_commit',
          'pull_request',
          'command_result',
          'reflection',
          'attestation',
          'receipt'
        )),
        CHECK (jsonb_typeof(metadata) = 'object')
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS task_evidence_fetches (
        id BIGSERIAL PRIMARY KEY,
        fetch_uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
        bundle_id BIGINT NOT NULL REFERENCES task_evidence_bundles(id) ON DELETE CASCADE,
        task_id BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        requested_url TEXT NOT NULL,
        canonical_url TEXT,
        evidence_item_id BIGINT REFERENCES task_evidence_items(id) ON DELETE SET NULL,
        error_code TEXT,
        error_message TEXT,
        reserved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP WITH TIME ZONE,
        CHECK (status IN ('pending', 'completed', 'failed', 'cancelled'))
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS task_validation_results (
        id BIGSERIAL PRIMARY KEY,
        validation_uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
        bundle_id BIGINT NOT NULL REFERENCES task_evidence_bundles(id) ON DELETE CASCADE,
        task_id BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        automation_run_id BIGINT REFERENCES automation_runs(id) ON DELETE SET NULL,
        provider TEXT NOT NULL DEFAULT 'deterministic',
        status TEXT NOT NULL,
        overall_verdict TEXT NOT NULL,
        requirement_results JSONB NOT NULL DEFAULT '[]'::jsonb,
        summary TEXT,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CHECK (status IN ('passed', 'needs_more_evidence', 'manual_review_required', 'failed')),
        CHECK (overall_verdict IN ('passed', 'needs_more_evidence', 'manual_review_required', 'failed')),
        CHECK (jsonb_typeof(requirement_results) = 'array'),
        CHECK (jsonb_typeof(metadata) = 'object')
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS task_validation_findings (
        id BIGSERIAL PRIMARY KEY,
        validation_result_id BIGINT NOT NULL REFERENCES task_validation_results(id) ON DELETE CASCADE,
        task_id BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        bundle_id BIGINT NOT NULL REFERENCES task_evidence_bundles(id) ON DELETE CASCADE,
        requirement_id TEXT,
        severity TEXT NOT NULL DEFAULT 'info',
        code TEXT NOT NULL,
        message TEXT NOT NULL,
        evidence_item_ids BIGINT[] NOT NULL DEFAULT '{}',
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CHECK (severity IN ('info', 'low', 'medium', 'high', 'critical')),
        CHECK (jsonb_typeof(metadata) = 'object')
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS task_validation_reviews (
        id BIGSERIAL PRIMARY KEY,
        validation_result_id BIGINT NOT NULL REFERENCES task_validation_results(id) ON DELETE CASCADE,
        bundle_id BIGINT NOT NULL REFERENCES task_evidence_bundles(id) ON DELETE CASCADE,
        task_id BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        requested_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        reviewer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        reason TEXT,
        decision TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        decided_at TIMESTAMP WITH TIME ZONE,
        CHECK (status IN ('pending', 'assigned', 'completed', 'cancelled')),
        CHECK (decision IS NULL OR decision IN ('passed', 'needs_more_evidence', 'failed'))
      );
    `);

    await client.query(`
      ALTER TABLE task_evidence_bundles DROP CONSTRAINT IF EXISTS task_evidence_bundles_source_kind_check;
      ALTER TABLE task_evidence_bundles ADD CONSTRAINT task_evidence_bundles_source_kind_check
        CHECK (source_kind IN ('human', 'automation', 'mixed'));
      ALTER TABLE task_evidence_bundles DROP CONSTRAINT IF EXISTS task_evidence_bundles_status_check;
      ALTER TABLE task_evidence_bundles ADD CONSTRAINT task_evidence_bundles_status_check
        CHECK (status IN (
          'draft',
          'previewed',
          'submitted',
          'validation_queued',
          'validating',
          'validation_passed',
          'needs_more_evidence',
          'manual_review_required',
          'validation_failed',
          'cancelled',
          'superseded'
        ));
      ALTER TABLE task_evidence_bundles
        ADD COLUMN IF NOT EXISTS frozen_manifest JSONB,
        ADD COLUMN IF NOT EXISTS manifest_sha256 TEXT,
        ADD COLUMN IF NOT EXISTS source_automation_run_id BIGINT REFERENCES automation_runs(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS frozen_at TIMESTAMP WITH TIME ZONE;
      ALTER TABLE task_evidence_bundles DROP CONSTRAINT IF EXISTS task_evidence_bundles_manifest_object_check;
      ALTER TABLE task_evidence_bundles ADD CONSTRAINT task_evidence_bundles_manifest_object_check
        CHECK (frozen_manifest IS NULL OR jsonb_typeof(frozen_manifest) = 'object');
      ALTER TABLE task_evidence_items DROP CONSTRAINT IF EXISTS task_evidence_items_evidence_type_check;
      ALTER TABLE task_evidence_items ADD CONSTRAINT task_evidence_items_evidence_type_check
        CHECK (evidence_type IN (
          'text',
          'url_snapshot',
          'image',
          'document',
          'artifact_reference',
          'automation_report',
          'repository_commit',
          'pull_request',
          'command_result',
          'reflection',
          'attestation',
          'receipt'
        ));
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS work_memory (
        id BIGSERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        category TEXT NOT NULL,
        content TEXT NOT NULL,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        source_client TEXT,
        related_project_id INTEGER,
        related_task_id INTEGER,
        related_community_id INTEGER,
        retention_policy TEXT NOT NULL DEFAULT 'work_relevant',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      DELETE FROM api_action_events a
      USING api_action_events b
      WHERE a.id > b.id
        AND a.action_id = b.action_id
        AND a.event_type = b.event_type
        AND COALESCE(a.event_key, '') = COALESCE(b.event_key, '')
        AND a.event_key IS NOT NULL;

      CREATE INDEX IF NOT EXISTS idx_api_tokens_user_id ON api_tokens(user_id);
      CREATE INDEX IF NOT EXISTS idx_api_tokens_hash ON api_tokens(token_hash);
      CREATE INDEX IF NOT EXISTS idx_api_actions_actor ON api_actions(actor_user_id);
      CREATE INDEX IF NOT EXISTS idx_api_actions_status ON api_actions(status);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_api_actions_one_active_preparation_preview
        ON api_actions(preparation_id)
        WHERE preparation_id IS NOT NULL AND status IN ('previewed', 'confirmed', 'executed');
      CREATE INDEX IF NOT EXISTS idx_api_action_events_action ON api_action_events(action_id);
      DROP INDEX IF EXISTS idx_api_action_events_once;
      CREATE UNIQUE INDEX IF NOT EXISTS idx_api_action_events_once
        ON api_action_events(action_id, event_type, event_key)
        WHERE event_key IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_automation_runs_action ON automation_runs(action_id);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_automation_runs_one_per_action
        ON automation_runs(action_id)
        WHERE action_id IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_automation_runs_status ON automation_runs(status);
      CREATE INDEX IF NOT EXISTS idx_automation_runs_preparation ON automation_runs(preparation_id);
      CREATE INDEX IF NOT EXISTS idx_automation_logs_run ON automation_logs(run_id);
      CREATE INDEX IF NOT EXISTS idx_automation_run_reports_run ON automation_run_reports(run_id);
      CREATE INDEX IF NOT EXISTS idx_task_automation_submissions_task ON task_automation_submissions(task_id);
      CREATE INDEX IF NOT EXISTS idx_task_evidence_blobs_hash ON task_evidence_blobs(content_sha256);
      CREATE INDEX IF NOT EXISTS idx_task_evidence_bundles_task ON task_evidence_bundles(task_id);
      CREATE INDEX IF NOT EXISTS idx_task_evidence_bundles_actor ON task_evidence_bundles(actor_user_id);
      CREATE INDEX IF NOT EXISTS idx_task_evidence_bundles_action ON task_evidence_bundles(action_id);
      CREATE INDEX IF NOT EXISTS idx_task_evidence_bundles_source_run ON task_evidence_bundles(source_automation_run_id);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_task_evidence_one_active_draft
        ON task_evidence_bundles(task_id, actor_user_id)
        WHERE status = 'draft';
      CREATE UNIQUE INDEX IF NOT EXISTS idx_task_evidence_one_action
        ON task_evidence_bundles(action_id)
        WHERE action_id IS NOT NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS idx_task_evidence_one_source_run
        ON task_evidence_bundles(source_automation_run_id)
        WHERE source_automation_run_id IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_task_evidence_fetches_bundle ON task_evidence_fetches(bundle_id);
      CREATE INDEX IF NOT EXISTS idx_task_evidence_fetches_status ON task_evidence_fetches(status);
      CREATE INDEX IF NOT EXISTS idx_task_evidence_items_bundle ON task_evidence_items(bundle_id);
      CREATE INDEX IF NOT EXISTS idx_task_evidence_items_task ON task_evidence_items(task_id);
      CREATE INDEX IF NOT EXISTS idx_task_validation_results_bundle ON task_validation_results(bundle_id);
      CREATE INDEX IF NOT EXISTS idx_task_validation_results_task ON task_validation_results(task_id);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_task_validation_results_run
        ON task_validation_results(automation_run_id)
        WHERE automation_run_id IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_task_validation_findings_result ON task_validation_findings(validation_result_id);
      CREATE INDEX IF NOT EXISTS idx_task_validation_reviews_task_status ON task_validation_reviews(task_id, status);
      CREATE INDEX IF NOT EXISTS idx_task_automation_preparations_task ON task_automation_preparations(task_id);
      CREATE INDEX IF NOT EXISTS idx_task_automation_preparations_actor ON task_automation_preparations(actor_user_id);
      CREATE INDEX IF NOT EXISTS idx_work_memory_user_id ON work_memory(user_id);
      CREATE INDEX IF NOT EXISTS idx_work_memory_category ON work_memory(category);
      CREATE INDEX IF NOT EXISTS idx_work_memory_project ON work_memory(related_project_id);
    `);

    for (const prompt of defaultPrompts) {
      await client.query(
        `INSERT INTO api_prompt_registry (prompt_key, version, prompt_text, schema, status)
         VALUES ($1, $2, $3, $4::jsonb, $5)
         ON CONFLICT (prompt_key, version) DO NOTHING`,
        [
          prompt.prompt_key,
          prompt.version,
          prompt.prompt_text,
          JSON.stringify(prompt.schema),
          prompt.status
        ]
      );
    }

    await client.query('COMMIT');
    console.log('PostgreSQL: Kamiya API tables created or already exist.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('PostgreSQL: Error creating Kamiya API tables:', err);
    throw err;
  } finally {
    client.release();
  }
}

export function hashApiToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}
