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
        ADD COLUMN IF NOT EXISTS related_automation_run_id BIGINT;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS api_action_events (
        id BIGSERIAL PRIMARY KEY,
        action_id BIGINT REFERENCES api_actions(id) ON DELETE CASCADE,
        event_type TEXT NOT NULL,
        actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS automation_runs (
        id BIGSERIAL PRIMARY KEY,
        run_uuid UUID NOT NULL DEFAULT gen_random_uuid(),
        action_id BIGINT REFERENCES api_actions(id) ON DELETE SET NULL,
        template_key TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'queued',
        input JSONB NOT NULL DEFAULT '{}'::jsonb,
        result JSONB,
        worker_name TEXT,
        source_client TEXT,
        actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        started_at TIMESTAMP WITH TIME ZONE,
        completed_at TIMESTAMP WITH TIME ZONE,
        UNIQUE (run_uuid)
      );
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
      CREATE INDEX IF NOT EXISTS idx_api_tokens_user_id ON api_tokens(user_id);
      CREATE INDEX IF NOT EXISTS idx_api_tokens_hash ON api_tokens(token_hash);
      CREATE INDEX IF NOT EXISTS idx_api_actions_actor ON api_actions(actor_user_id);
      CREATE INDEX IF NOT EXISTS idx_api_actions_status ON api_actions(status);
      CREATE INDEX IF NOT EXISTS idx_api_action_events_action ON api_action_events(action_id);
      CREATE INDEX IF NOT EXISTS idx_automation_runs_action ON automation_runs(action_id);
      CREATE INDEX IF NOT EXISTS idx_automation_runs_status ON automation_runs(status);
      CREATE INDEX IF NOT EXISTS idx_automation_logs_run ON automation_logs(run_id);
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
