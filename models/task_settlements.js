import pool from '../backend/db.js';

export async function createTaskSettlementTables() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      ALTER TABLE projects
        ADD COLUMN IF NOT EXISTS settlement_policy JSONB NOT NULL DEFAULT '{}'::jsonb,
        ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;
      ALTER TABLE tasks
        ADD COLUMN IF NOT EXISTS settlement_policy JSONB NOT NULL DEFAULT '{}'::jsonb,
        ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;
      ALTER TABLE task_evidence_bundles
        ADD COLUMN IF NOT EXISTS encounter_context JSONB NOT NULL DEFAULT '{}'::jsonb;
      ALTER TABLE task_acceptance_records
        ADD COLUMN IF NOT EXISTS settled_at TIMESTAMP WITH TIME ZONE;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS token_transactions (
        id SERIAL PRIMARY KEY,
        sender_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        receiver_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        amount NUMERIC(36,18) NOT NULL CHECK (amount > 0),
        reason VARCHAR(255),
        related_task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
        related_exchange_id INTEGER,
        tx_hash TEXT,
        chain TEXT,
        on_chain_status VARCHAR(50),
        transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        notes TEXT
      );

      CREATE TABLE IF NOT EXISTS task_settlements (
        id BIGSERIAL PRIMARY KEY,
        settlement_uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
        acceptance_record_id BIGINT UNIQUE NOT NULL REFERENCES task_acceptance_records(id) ON DELETE RESTRICT,
        task_id BIGINT UNIQUE NOT NULL REFERENCES tasks(id) ON DELETE RESTRICT,
        review_round_id BIGINT NOT NULL REFERENCES task_review_rounds(id) ON DELETE RESTRICT,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
        action_id BIGINT REFERENCES api_actions(id) ON DELETE SET NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        policy_version TEXT NOT NULL DEFAULT 'task-settlement-v1',
        policy_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
        result_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
        idempotency_key TEXT UNIQUE NOT NULL,
        attempt_count INTEGER NOT NULL DEFAULT 0,
        next_attempt_at TIMESTAMP WITH TIME ZONE,
        last_error_code TEXT,
        last_error_message TEXT,
        last_error_details JSONB,
        started_at TIMESTAMP WITH TIME ZONE,
        completed_at TIMESTAMP WITH TIME ZONE,
        cancelled_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CHECK (status IN ('pending', 'queued', 'running', 'retry_wait', 'completed', 'blocked', 'failed', 'cancelled')),
        CHECK (jsonb_typeof(policy_snapshot) = 'object'),
        CHECK (jsonb_typeof(result_snapshot) = 'object'),
        CHECK (last_error_details IS NULL OR jsonb_typeof(last_error_details) = 'object')
      );

      CREATE TABLE IF NOT EXISTS task_completion_records (
        id BIGSERIAL PRIMARY KEY,
        completion_uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
        settlement_id BIGINT UNIQUE NOT NULL REFERENCES task_settlements(id) ON DELETE RESTRICT,
        task_id BIGINT UNIQUE NOT NULL REFERENCES tasks(id) ON DELETE RESTRICT,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
        completed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        evidence_manifest_sha256 TEXT NOT NULL,
        completion_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
        completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CHECK (jsonb_typeof(completion_snapshot) = 'object')
      );

      CREATE TABLE IF NOT EXISTS reward_ledger_events (
        id BIGSERIAL PRIMARY KEY,
        reward_uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
        settlement_id BIGINT NOT NULL REFERENCES task_settlements(id) ON DELETE RESTRICT,
        task_id BIGINT NOT NULL REFERENCES tasks(id) ON DELETE RESTRICT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        reward_role TEXT NOT NULL,
        amount NUMERIC(36,18) NOT NULL CHECK (amount >= 0),
        token_type TEXT NOT NULL,
        event_key TEXT UNIQUE NOT NULL,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        posted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CHECK (reward_role IN ('contributor', 'peer_reviewer', 'pm_reviewer')),
        CHECK (jsonb_typeof(metadata) = 'object')
      );

      CREATE TABLE IF NOT EXISTS skill_xp_events (
        id BIGSERIAL PRIMARY KEY,
        xp_uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
        settlement_id BIGINT NOT NULL REFERENCES task_settlements(id) ON DELETE RESTRICT,
        task_id BIGINT NOT NULL REFERENCES tasks(id) ON DELETE RESTRICT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        skill_id INTEGER NOT NULL REFERENCES skills(id) ON DELETE RESTRICT,
        xp_delta INTEGER NOT NULL CHECK (xp_delta >= 0),
        previous_xp INTEGER NOT NULL,
        new_xp INTEGER NOT NULL,
        previous_level INTEGER NOT NULL,
        new_level INTEGER NOT NULL,
        event_key TEXT UNIQUE NOT NULL,
        posted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS task_settlement_events (
        id BIGSERIAL PRIMARY KEY,
        event_uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
        settlement_id BIGINT NOT NULL REFERENCES task_settlements(id) ON DELETE CASCADE,
        task_id BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        event_type TEXT NOT NULL,
        event_key TEXT UNIQUE NOT NULL,
        payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CHECK (jsonb_typeof(payload) = 'object')
      );

      CREATE TABLE IF NOT EXISTS task_settlement_outbox (
        id BIGSERIAL PRIMARY KEY,
        outbox_uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
        settlement_id BIGINT NOT NULL REFERENCES task_settlements(id) ON DELETE CASCADE,
        event_type TEXT NOT NULL,
        event_key TEXT UNIQUE NOT NULL,
        payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        status TEXT NOT NULL DEFAULT 'pending',
        attempt_count INTEGER NOT NULL DEFAULT 0,
        last_error TEXT,
        delivered_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CHECK (status IN ('pending', 'delivering', 'delivered', 'failed')),
        CHECK (jsonb_typeof(payload) = 'object')
      );

      CREATE TABLE IF NOT EXISTS domain_events (
        sequence BIGSERIAL PRIMARY KEY,
        event_uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
        event_type TEXT NOT NULL,
        event_key TEXT UNIQUE NOT NULL,
        aggregate_type TEXT NOT NULL,
        aggregate_id TEXT NOT NULL,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        community_id INTEGER REFERENCES communities(id) ON DELETE SET NULL,
        actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        correlation_id TEXT,
        causation_id TEXT,
        payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CHECK (jsonb_typeof(payload) = 'object')
      );
    `);

    // Packet-era databases may already contain the original settlement ledger
    // tables. Bring those tables forward before creating indexes or accepting
    // writes from the canonical settlement service.
    await client.query(`
      ALTER TABLE task_settlements
        ADD COLUMN IF NOT EXISTS result_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
        ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
        ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS last_error_code TEXT,
        ADD COLUMN IF NOT EXISTS last_error_message TEXT,
        ADD COLUMN IF NOT EXISTS last_error_details JSONB,
        ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE;

      ALTER TABLE task_completion_records
        ADD COLUMN IF NOT EXISTS completed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS evidence_manifest_sha256 TEXT,
        ADD COLUMN IF NOT EXISTS completion_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb;

      ALTER TABLE reward_ledger_events
        ADD COLUMN IF NOT EXISTS reward_uuid UUID NOT NULL DEFAULT gen_random_uuid(),
        ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE RESTRICT,
        ADD COLUMN IF NOT EXISTS event_key TEXT,
        ADD COLUMN IF NOT EXISTS posted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP;

      ALTER TABLE skill_xp_events
        ADD COLUMN IF NOT EXISTS xp_uuid UUID NOT NULL DEFAULT gen_random_uuid(),
        ADD COLUMN IF NOT EXISTS event_key TEXT,
        ADD COLUMN IF NOT EXISTS posted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP;
    `);

    await client.query(`
      DO $$
      DECLARE
        legacy_column TEXT;
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = current_schema() AND table_name = 'task_settlements' AND column_name = 'effect_plan'
        ) THEN
          EXECUTE $migration$
            UPDATE task_settlements
            SET result_snapshot = CASE
              WHEN result_snapshot = '{}'::jsonb THEN COALESCE(effect_plan, '{}'::jsonb)
              ELSE result_snapshot
            END
          $migration$;
        END IF;
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = current_schema() AND table_name = 'task_settlements' AND column_name = 'next_retry_at'
        ) THEN
          EXECUTE 'UPDATE task_settlements SET next_attempt_at = COALESCE(next_attempt_at, next_retry_at)';
        END IF;
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = current_schema() AND table_name = 'task_settlements' AND column_name = 'last_error'
        ) THEN
          EXECUTE 'UPDATE task_settlements SET last_error_message = COALESCE(last_error_message, last_error::text), last_error_details = COALESCE(last_error_details, CASE WHEN jsonb_typeof(last_error) = ''object'' THEN last_error ELSE NULL END) WHERE last_error IS NOT NULL';
        END IF;

        UPDATE task_settlements
        SET idempotency_key = COALESCE(idempotency_key, 'legacy:settlement:' || id::text);
        ALTER TABLE task_settlements ALTER COLUMN idempotency_key SET NOT NULL;

        FOREACH legacy_column IN ARRAY ARRAY['bundle_id', 'validation_result_id', 'manifest_sha256'] LOOP
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = current_schema() AND table_name = 'task_settlements' AND column_name = legacy_column
          ) THEN
            EXECUTE format('ALTER TABLE task_settlements ALTER COLUMN %I DROP NOT NULL', legacy_column);
          END IF;
        END LOOP;

        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = current_schema() AND table_name = 'task_completion_records' AND column_name = 'completed_by_user_id'
        ) THEN
          EXECUTE 'UPDATE task_completion_records SET completed_by = COALESCE(completed_by, completed_by_user_id)';
        END IF;
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = current_schema() AND table_name = 'task_completion_records' AND column_name = 'manifest_sha256'
        ) THEN
          EXECUTE 'UPDATE task_completion_records SET evidence_manifest_sha256 = COALESCE(evidence_manifest_sha256, manifest_sha256)';
        END IF;
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = current_schema() AND table_name = 'task_completion_records' AND column_name = 'completion_payload'
        ) THEN
          EXECUTE 'UPDATE task_completion_records SET completion_snapshot = CASE WHEN completion_snapshot = ''{}''::jsonb THEN COALESCE(completion_payload, ''{}''::jsonb) ELSE completion_snapshot END';
        END IF;
        UPDATE task_completion_records
        SET evidence_manifest_sha256 = COALESCE(evidence_manifest_sha256, 'legacy:completion:' || id::text);
        ALTER TABLE task_completion_records ALTER COLUMN evidence_manifest_sha256 SET NOT NULL;

        FOREACH legacy_column IN ARRAY ARRAY['acceptance_record_id', 'manifest_sha256'] LOOP
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = current_schema() AND table_name = 'task_completion_records' AND column_name = legacy_column
          ) THEN
            EXECUTE format('ALTER TABLE task_completion_records ALTER COLUMN %I DROP NOT NULL', legacy_column);
          END IF;
        END LOOP;

        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = current_schema() AND table_name = 'reward_ledger_events' AND column_name = 'event_uuid'
        ) THEN
          EXECUTE 'UPDATE reward_ledger_events SET reward_uuid = COALESCE(reward_uuid, event_uuid)';
        END IF;
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = current_schema() AND table_name = 'reward_ledger_events' AND column_name = 'recipient_user_id'
        ) THEN
          EXECUTE 'UPDATE reward_ledger_events SET user_id = COALESCE(user_id, recipient_user_id)';
        END IF;
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = current_schema() AND table_name = 'reward_ledger_events' AND column_name = 'idempotency_key'
        ) THEN
          EXECUTE 'UPDATE reward_ledger_events SET event_key = COALESCE(event_key, idempotency_key)';
        END IF;
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = current_schema() AND table_name = 'reward_ledger_events' AND column_name = 'created_at'
        ) THEN
          EXECUTE 'UPDATE reward_ledger_events SET posted_at = COALESCE(posted_at, created_at)';
        END IF;
        UPDATE reward_ledger_events
        SET event_key = COALESCE(event_key, 'legacy:reward:' || id::text),
            posted_at = COALESCE(posted_at, CURRENT_TIMESTAMP);
        ALTER TABLE reward_ledger_events ALTER COLUMN user_id SET NOT NULL;
        ALTER TABLE reward_ledger_events ALTER COLUMN event_key SET NOT NULL;

        FOREACH legacy_column IN ARRAY ARRAY['project_id', 'recipient_user_id', 'previous_balance', 'new_balance', 'policy_version', 'idempotency_key'] LOOP
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = current_schema() AND table_name = 'reward_ledger_events' AND column_name = legacy_column
          ) THEN
            EXECUTE format('ALTER TABLE reward_ledger_events ALTER COLUMN %I DROP NOT NULL', legacy_column);
          END IF;
        END LOOP;

        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = current_schema() AND table_name = 'skill_xp_events' AND column_name = 'event_uuid'
        ) THEN
          EXECUTE 'UPDATE skill_xp_events SET xp_uuid = COALESCE(xp_uuid, event_uuid)';
        END IF;
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = current_schema() AND table_name = 'skill_xp_events' AND column_name = 'idempotency_key'
        ) THEN
          EXECUTE 'UPDATE skill_xp_events SET event_key = COALESCE(event_key, idempotency_key)';
        END IF;
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = current_schema() AND table_name = 'skill_xp_events' AND column_name = 'created_at'
        ) THEN
          EXECUTE 'UPDATE skill_xp_events SET posted_at = COALESCE(posted_at, created_at)';
        END IF;
        UPDATE skill_xp_events
        SET event_key = COALESCE(event_key, 'legacy:xp:' || id::text),
            posted_at = COALESCE(posted_at, CURRENT_TIMESTAMP);
        ALTER TABLE skill_xp_events ALTER COLUMN event_key SET NOT NULL;

        FOREACH legacy_column IN ARRAY ARRAY['policy_version', 'idempotency_key'] LOOP
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = current_schema() AND table_name = 'skill_xp_events' AND column_name = legacy_column
          ) THEN
            EXECUTE format('ALTER TABLE skill_xp_events ALTER COLUMN %I DROP NOT NULL', legacy_column);
          END IF;
        END LOOP;

        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = current_schema() AND table_name = 'task_settlement_events' AND column_name = 'project_id'
        ) THEN
          ALTER TABLE task_settlement_events ALTER COLUMN project_id DROP NOT NULL;
        END IF;
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = current_schema() AND table_name = 'task_settlement_outbox' AND column_name = 'destination'
        ) THEN
          ALTER TABLE task_settlement_outbox ALTER COLUMN destination DROP NOT NULL;
        END IF;
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = current_schema() AND table_name = 'task_settlement_outbox'
            AND column_name = 'last_error' AND data_type = 'jsonb'
        ) THEN
          ALTER TABLE task_settlement_outbox DROP CONSTRAINT IF EXISTS task_settlement_outbox_last_error_check;
          ALTER TABLE task_settlement_outbox ALTER COLUMN last_error TYPE TEXT USING last_error::text;
        END IF;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'task_settlements_idempotency_key_key' AND conrelid = 'task_settlements'::regclass) THEN
          ALTER TABLE task_settlements ADD CONSTRAINT task_settlements_idempotency_key_key UNIQUE (idempotency_key);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'task_settlements_result_snapshot_check' AND conrelid = 'task_settlements'::regclass) THEN
          ALTER TABLE task_settlements ADD CONSTRAINT task_settlements_result_snapshot_check CHECK (jsonb_typeof(result_snapshot) = 'object');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'task_completion_records_completion_snapshot_check' AND conrelid = 'task_completion_records'::regclass) THEN
          ALTER TABLE task_completion_records ADD CONSTRAINT task_completion_records_completion_snapshot_check CHECK (jsonb_typeof(completion_snapshot) = 'object');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reward_ledger_events_reward_uuid_key' AND conrelid = 'reward_ledger_events'::regclass) THEN
          ALTER TABLE reward_ledger_events ADD CONSTRAINT reward_ledger_events_reward_uuid_key UNIQUE (reward_uuid);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reward_ledger_events_event_key_key' AND conrelid = 'reward_ledger_events'::regclass) THEN
          ALTER TABLE reward_ledger_events ADD CONSTRAINT reward_ledger_events_event_key_key UNIQUE (event_key);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'skill_xp_events_xp_uuid_key' AND conrelid = 'skill_xp_events'::regclass) THEN
          ALTER TABLE skill_xp_events ADD CONSTRAINT skill_xp_events_xp_uuid_key UNIQUE (xp_uuid);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'skill_xp_events_event_key_key' AND conrelid = 'skill_xp_events'::regclass) THEN
          ALTER TABLE skill_xp_events ADD CONSTRAINT skill_xp_events_event_key_key UNIQUE (event_key);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'task_settlement_events_event_key_key' AND conrelid = 'task_settlement_events'::regclass) THEN
          ALTER TABLE task_settlement_events ADD CONSTRAINT task_settlement_events_event_key_key UNIQUE (event_key);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'task_settlement_outbox_event_key_key' AND conrelid = 'task_settlement_outbox'::regclass) THEN
          ALTER TABLE task_settlement_outbox ADD CONSTRAINT task_settlement_outbox_event_key_key UNIQUE (event_key);
        END IF;
      END $$;
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_task_settlements_status ON task_settlements(status, next_attempt_at);
      CREATE INDEX IF NOT EXISTS idx_task_settlements_project ON task_settlements(project_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_reward_ledger_settlement ON reward_ledger_events(settlement_id);
      CREATE INDEX IF NOT EXISTS idx_skill_xp_settlement ON skill_xp_events(settlement_id);
      CREATE INDEX IF NOT EXISTS idx_settlement_outbox_status ON task_settlement_outbox(status, created_at);
      CREATE INDEX IF NOT EXISTS idx_domain_events_project_cursor ON domain_events(project_id, sequence);
      CREATE INDEX IF NOT EXISTS idx_domain_events_aggregate ON domain_events(aggregate_type, aggregate_id, sequence);
    `);

    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'task_settlements_attempt_count_check' AND conrelid = 'task_settlements'::regclass) THEN
          ALTER TABLE task_settlements ADD CONSTRAINT task_settlements_attempt_count_check CHECK (attempt_count >= 0);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reward_ledger_events_amount_bound_check' AND conrelid = 'reward_ledger_events'::regclass) THEN
          ALTER TABLE reward_ledger_events ADD CONSTRAINT reward_ledger_events_amount_bound_check
            CHECK (amount >= 0 AND amount <= 1000000 AND amount = trunc(amount));
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'skill_xp_events_consistency_check' AND conrelid = 'skill_xp_events'::regclass) THEN
          ALTER TABLE skill_xp_events ADD CONSTRAINT skill_xp_events_consistency_check
            CHECK (xp_delta BETWEEN 0 AND 1000000 AND previous_xp >= 0 AND new_xp = previous_xp + xp_delta AND previous_level >= 1 AND new_level >= 1);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'task_settlement_outbox_attempt_count_check' AND conrelid = 'task_settlement_outbox'::regclass) THEN
          ALTER TABLE task_settlement_outbox ADD CONSTRAINT task_settlement_outbox_attempt_count_check CHECK (attempt_count >= 0);
        END IF;
      END $$;
    `);

    await client.query('COMMIT');
    console.log('PostgreSQL: task settlement and canonical domain event tables created or already exist.');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
