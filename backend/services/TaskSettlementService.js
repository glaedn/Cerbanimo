import pool from '../db.js';
import boss from '../jobs/boss.js';

export const TASK_SETTLEMENT_QUEUE = 'task-completion-settlement';
export const TASK_SETTLEMENT_SWEEP_QUEUE = 'task-completion-settlement-sweep';
export const SETTLEMENT_POLICY_VERSION = 'task-settlement-v1';

const terminalStatuses = new Set(['completed', 'blocked', 'failed', 'cancelled']);

function asObject(value) {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value;
  try { return JSON.parse(value); } catch { return {}; }
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  try { return JSON.parse(value || '[]'); } catch { return []; }
}

function uniqueIds(values) {
  return [...new Set(asArray(values).map(Number).filter(value => Number.isInteger(value) && value > 0))];
}

export function levelForXp(xp) {
  return Math.floor(Math.sqrt(Math.max(0, Number(xp || 0)) / 40)) + 1;
}

export function buildContributorAllocations({ total, participantUserIds, leaderUserId = null, mode = 'equal', leaderWeight = 1.5 }) {
  const participants = uniqueIds(participantUserIds).sort((a, b) => a - b);
  const reward = Math.max(0, Math.round(Number(total || 0)));
  if (!participants.length) return [];
  const leader = participants.includes(Number(leaderUserId)) ? Number(leaderUserId) : null;
  const weights = participants.map(userId => mode === 'leader_weighted' && userId === leader ? Math.max(1, Number(leaderWeight || 1.5)) : 1);
  const denominator = weights.reduce((sum, weight) => sum + weight, 0);
  const raw = weights.map(weight => reward * weight / denominator);
  const amounts = raw.map(Math.floor);
  let remainder = reward - amounts.reduce((sum, amount) => sum + amount, 0);
  raw.map((value, index) => ({ index, fraction: value - amounts[index] }))
    .sort((a, b) => b.fraction - a.fraction || participants[a.index] - participants[b.index])
    .forEach(item => { if (remainder-- > 0) amounts[item.index] += 1; });
  return participants.map((userId, index) => ({ userId, amount: amounts[index], role: 'contributor' }));
}

export function resolveSettlementPolicy(row) {
  const projectPolicy = asObject(row.project_settlement_policy);
  const taskPolicy = asObject(row.task_settlement_policy);
  const reviewPolicy = asObject(row.review_policy_snapshot);
  const encounter = asObject(row.encounter_context);
  const rewardTokens = row.reward_tokens === null || row.reward_tokens === undefined ? null : Number(row.reward_tokens);
  return {
    policyVersion: SETTLEMENT_POLICY_VERSION,
    rewardTokens,
    peerReviewerRewardAmount: Number(taskPolicy.peerReviewerRewardAmount ?? projectPolicy.peerReviewerRewardAmount ?? reviewPolicy.peerReviewerRewardAmount ?? 0),
    pmReviewerRewardAmount: Number(taskPolicy.pmReviewerRewardAmount ?? projectPolicy.pmReviewerRewardAmount ?? reviewPolicy.pmReviewerRewardAmount ?? 0),
    rewardMode: encounter.rewardPolicy?.mode || taskPolicy.rewardMode || projectPolicy.rewardMode || 'equal',
    partyLeaderUserId: Number(encounter.rewardPolicy?.partyLeaderUserId || taskPolicy.partyLeaderUserId || projectPolicy.partyLeaderUserId || 0) || null,
    leaderWeight: Number(encounter.rewardPolicy?.leaderWeight || taskPolicy.leaderWeight || projectPolicy.leaderWeight || 1.5),
    tokenType: String(taskPolicy.tokenType || projectPolicy.tokenType || `${row.community_name || 'Cerbanimo'} Coin`),
    source: { task: taskPolicy, project: projectPolicy, review: reviewPolicy, encounter }
  };
}

class TaskSettlementService {
  constructor(database = pool) {
    this.pool = database;
  }

  async previewForTask({ taskId, authContext = {}, sourceClient = 'api' }) {
    const client = await this.pool.connect();
    let settlementId;
    try {
      await client.query('BEGIN');
      const row = await this.lockAcceptedTask(client, taskId);
      if (!row) throw this.error('SETTLEMENT_NOT_READY', 'No accepted review is ready for settlement.', 409);
      const existing = await client.query('SELECT * FROM task_settlements WHERE acceptance_record_id = $1 FOR UPDATE', [row.acceptance_record_id]);
      if (existing.rows[0]) {
        settlementId = existing.rows[0].id;
        await client.query('COMMIT');
      } else {
        const policy = resolveSettlementPolicy(row);
        const missingRewardPolicy = !Number.isFinite(policy.rewardTokens) || policy.rewardTokens < 0;
        const status = missingRewardPolicy ? 'blocked' : 'queued';
        const errorCode = missingRewardPolicy ? 'SETTLEMENT_REWARD_POLICY_MISSING' : null;
        const errorMessage = missingRewardPolicy ? 'The accepted task has no authoritative contributor reward amount.' : null;
        const inserted = await client.query(
          `INSERT INTO task_settlements (
             acceptance_record_id, task_id, review_round_id, project_id, status,
             policy_version, policy_snapshot, idempotency_key,
             last_error_code, last_error_message, last_error_details
           ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, $11::jsonb)
           RETURNING *`,
          [row.acceptance_record_id, row.task_id, row.review_round_id, row.project_id, status,
            SETTLEMENT_POLICY_VERSION, JSON.stringify(policy), `acceptance:${row.acceptance_uuid}`,
            errorCode, errorMessage, errorCode ? JSON.stringify({ sourceClient, rewardTokens: row.reward_tokens }) : null]
        );
        settlementId = inserted.rows[0].id;
        await client.query('COMMIT');
      }
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    if (settlementId) {
      const context = await this.hydrate(settlementId, authContext);
      if (context?.status === 'queued') await this.enqueue(settlementId);
      return context;
    }
    return null;
  }

  async enqueue(settlementId) {
    try {
      await boss.send(TASK_SETTLEMENT_QUEUE, { settlementId }, { retryLimit: 5, retryBackoff: true });
    } catch (error) {
      if (process.env.NODE_ENV !== 'test') console.warn('Settlement queue unavailable; durable sweep will retry.', error.message);
    }
  }

  async enqueuePending() {
    const acceptedWithoutSettlement = (await this.pool.query(
      `SELECT ar.task_id
       FROM task_acceptance_records ar
       LEFT JOIN task_settlements s ON s.acceptance_record_id = ar.id
       WHERE ar.settlement_status = 'pending' AND s.id IS NULL
       ORDER BY ar.accepted_at ASC LIMIT 100`
    )).rows;
    for (const row of acceptedWithoutSettlement) {
      await this.previewForTask({
        taskId: row.task_id,
        authContext: { isServiceActor: true, scopes: ['actions:service'] },
        sourceClient: 'settlement-worker'
      });
    }
    const rows = (await this.pool.query(
      `SELECT id FROM task_settlements
       WHERE status IN ('queued', 'retry_wait')
         AND (next_attempt_at IS NULL OR next_attempt_at <= NOW())
       ORDER BY created_at ASC LIMIT 100`
    )).rows;
    for (const row of rows) await this.enqueue(row.id);
    await this.dispatchPendingOutbox();
    return { discovered: acceptedWithoutSettlement.length, queued: rows.length };
  }

  async settle({ settlementId }) {
    const client = await this.pool.connect();
    let result;
    try {
      await client.query('BEGIN');
      const settlement = (await client.query(
        `SELECT s.*, ar.settlement_status AS acceptance_status, ar.evidence_manifest_sha256,
                r.submission_actor_user_id, r.policy_snapshot AS review_policy_snapshot,
                t.name AS task_name, t.status AS task_status, t.assigned_user_ids, t.submitted_by,
                t.reward_tokens, t.skill_id, t.reflection, t.proof_of_work_links,
                p.name AS project_name, p.community_id,
                c.name AS community_name
         FROM task_settlements s
         JOIN task_acceptance_records ar ON ar.id = s.acceptance_record_id
         JOIN task_review_rounds r ON r.id = s.review_round_id
         JOIN tasks t ON t.id = s.task_id
         JOIN projects p ON p.id = s.project_id
         LEFT JOIN communities c ON c.id = p.community_id
         WHERE s.id::text = $1 OR s.settlement_uuid::text = $1
         FOR UPDATE OF s, ar, r, t`,
        [String(settlementId)]
      )).rows[0];
      if (!settlement) throw this.error('SETTLEMENT_NOT_FOUND', 'Settlement not found.', 404);
      if (settlement.status === 'completed') {
        await client.query('COMMIT');
        return this.hydrate(settlement.id);
      }
      if (!['queued', 'retry_wait', 'pending', 'running'].includes(settlement.status)) {
        await client.query('COMMIT');
        return this.hydrate(settlement.id);
      }
      await client.query(
        `UPDATE task_settlements SET status = 'running', attempt_count = attempt_count + 1,
           started_at = COALESCE(started_at, NOW()), updated_at = NOW(),
           last_error_code = NULL, last_error_message = NULL, last_error_details = NULL
         WHERE id = $1`, [settlement.id]
      );
      if (settlement.acceptance_status !== 'pending') throw this.error('SETTLEMENT_ACCEPTANCE_STALE', 'Acceptance is not pending settlement.', 409);
      if (settlement.task_status === 'completed') throw this.error('SETTLEMENT_TASK_ALREADY_COMPLETED', 'Task was completed outside the accepted settlement.', 409);

      const policy = asObject(settlement.policy_snapshot);
      if (!Number.isFinite(Number(policy.rewardTokens))) throw this.error('SETTLEMENT_REWARD_POLICY_MISSING', 'The accepted task has no authoritative contributor reward amount.', 409, false);
      const contributorIds = uniqueIds([
        ...asArray(settlement.assigned_user_ids),
        settlement.submitted_by,
        settlement.submission_actor_user_id
      ]);
      if (!contributorIds.length) throw this.error('SETTLEMENT_CONTRIBUTOR_MISSING', 'Settlement has no accountable contributor.', 409, false);
      const contributorRewards = buildContributorAllocations({
        total: policy.rewardTokens,
        participantUserIds: contributorIds,
        leaderUserId: policy.partyLeaderUserId,
        mode: policy.rewardMode,
        leaderWeight: policy.leaderWeight
      });
      const reviewerRows = (await client.query(
        `SELECT DISTINCT ON (a.reviewer_user_id, a.reviewer_role)
                a.reviewer_user_id, a.reviewer_role
         FROM task_review_assignments a
         JOIN task_review_decisions d ON d.assignment_id = a.id
         WHERE a.review_round_id = $1 AND a.status = 'completed'
           AND d.decision = 'approve' AND d.supersedes_decision_id IS NULL
           AND a.reviewer_role IN ('peer_reviewer', 'pm_reviewer')
         ORDER BY a.reviewer_user_id, a.reviewer_role, d.created_at DESC`,
        [settlement.review_round_id]
      )).rows;
      const reviewerRewards = reviewerRows.map(row => ({
        userId: Number(row.reviewer_user_id),
        role: row.reviewer_role,
        amount: row.reviewer_role === 'peer_reviewer' ? Number(policy.peerReviewerRewardAmount || 0) : Number(policy.pmReviewerRewardAmount || 0)
      })).filter(reward => reward.amount > 0);
      const rewards = [...contributorRewards, ...reviewerRewards];
      for (const reward of rewards) await this.postReward(client, settlement, reward, policy.tokenType);

      const skillChanges = settlement.skill_id
        ? await this.postSkillXp(client, settlement, contributorRewards)
        : [];
      const completion = (await client.query(
        `INSERT INTO task_completion_records (
           settlement_id, task_id, project_id, completed_by, evidence_manifest_sha256, completion_snapshot
         ) VALUES ($1, $2, $3, $4, $5, $6::jsonb)
         RETURNING *`,
        [settlement.id, settlement.task_id, settlement.project_id,
          settlement.submitted_by || settlement.submission_actor_user_id || null,
          settlement.evidence_manifest_sha256,
          JSON.stringify({ reviewRoundId: settlement.review_round_id, policyVersion: settlement.policy_version })]
      )).rows[0];
      await client.query(
        `UPDATE tasks SET status = 'completed', completed_at = $2, updated_at = NOW() WHERE id = $1`,
        [settlement.task_id, completion.completed_at]
      );
      const activatedTasks = (await client.query(
        `UPDATE tasks candidate
         SET status = CASE WHEN cardinality(COALESCE(candidate.assigned_user_ids, '{}'::int[])) > 0
                           THEN 'active-assigned' ELSE 'active-unassigned' END,
             updated_at = NOW()
         WHERE candidate.project_id = $1
           AND $2 = ANY(COALESCE(candidate.dependencies, '{}'::int[]))
           AND candidate.status::text LIKE 'inactive%'
           AND NOT EXISTS (
             SELECT 1 FROM unnest(COALESCE(candidate.dependencies, '{}'::int[])) dependency_id
             JOIN tasks dependency ON dependency.id = dependency_id
             WHERE dependency.status <> 'completed'
           )
         RETURNING candidate.id, candidate.name, candidate.status`,
        [settlement.project_id, settlement.task_id]
      )).rows;
      const remaining = Number((await client.query(
        `SELECT COUNT(*)::int AS count FROM tasks
         WHERE project_id = $1 AND status NOT IN ('completed', 'cancelled')`, [settlement.project_id]
      )).rows[0]?.count || 0);
      const projectCompleted = remaining === 0;
      if (projectCompleted) await client.query(`UPDATE projects SET status = 'completed', completed_at = NOW() WHERE id = $1`, [settlement.project_id]);
      const storyEvent = (await client.query(
        `INSERT INTO project_narrative_events (
           project_id, task_id, review_round_id, actor_user_id, event_type, event_key, title, body, facts, visibility
         ) VALUES ($1, $2, $3, $4, 'task.settled', $5, $6, $7, $8::jsonb, 'party')
         ON CONFLICT (project_id, event_key) WHERE event_key IS NOT NULL DO UPDATE SET event_key = EXCLUDED.event_key
         RETURNING event_uuid`,
        [settlement.project_id, settlement.task_id, settlement.review_round_id,
          settlement.submitted_by || settlement.submission_actor_user_id || null,
          `settlement:${settlement.settlement_uuid}:chronicle`,
          `Encounter settled: ${settlement.task_name}`,
          projectCompleted ? 'The final encounter is complete. The quest has reached its epilogue.' : `${activatedTasks.length} sealed path(s) opened for the party.`,
          JSON.stringify({ settlementId: settlement.settlement_uuid, activatedTaskIds: activatedTasks.map(task => task.id), projectCompleted })]
      )).rows[0];

      const resultSnapshot = {
        activatedTasks,
        projectCompleted,
        remainingRequiredTasks: remaining,
        storyEventId: storyEvent?.event_uuid || null,
        rewardCount: rewards.length,
        skillChangeCount: skillChanges.length,
        completionRecordId: completion.id
      };
      await this.recordSettlementEvent(client, settlement, 'task.completed', { completionRecordId: completion.id, projectCompleted });
      await this.recordSettlementEvent(client, settlement, 'reward.released', { rewardCount: rewards.length });
      await this.recordSettlementEvent(client, settlement, 'dependencies.activated', { activatedTasks });
      await this.recordSettlementEvent(client, settlement, 'chronicle.entry_created', { eventId: storyEvent?.event_uuid || null });
      for (const [eventType, payload] of [
        ['task.completed', { taskId: settlement.task_id, projectId: settlement.project_id, completedAt: completion.completed_at }],
        ['reward.released', { taskId: settlement.task_id, projectId: settlement.project_id, rewards: rewards.map(reward => ({ userId: reward.userId, role: reward.role, amount: reward.amount, tokenType: policy.tokenType })) }],
        ['dependencies.activated', { taskId: settlement.task_id, projectId: settlement.project_id, activatedTasks }],
        ['chronicle.entry_created', { taskId: settlement.task_id, projectId: settlement.project_id, eventId: storyEvent?.event_uuid || null, projectCompleted }]
      ]) await this.writeOutbox(client, settlement, eventType, payload);

      await client.query(`UPDATE task_acceptance_records SET settlement_status = 'settled', settled_at = NOW() WHERE id = $1`, [settlement.acceptance_record_id]);
      await client.query(
        `UPDATE task_settlements SET status = 'completed', result_snapshot = $2::jsonb,
           completed_at = NOW(), updated_at = NOW() WHERE id = $1`,
        [settlement.id, JSON.stringify(resultSnapshot)]
      );
      await client.query('COMMIT');
      result = { settlementId: settlement.id };
    } catch (error) {
      await client.query('ROLLBACK');
      await this.markFailure(settlementId, error);
      throw error;
    } finally {
      client.release();
    }
    await this.dispatchOutbox(result.settlementId);
    return this.hydrate(result.settlementId);
  }

  async postReward(client, settlement, reward, tokenType) {
    const eventKey = `settlement:${settlement.settlement_uuid}:reward:${reward.role}:${reward.userId}`;
    const inserted = await client.query(
      `INSERT INTO reward_ledger_events (settlement_id, task_id, user_id, reward_role, amount, token_type, event_key, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
       ON CONFLICT (event_key) DO NOTHING RETURNING *`,
      [settlement.id, settlement.task_id, reward.userId, reward.role, reward.amount, tokenType, eventKey,
        JSON.stringify({ projectId: settlement.project_id, reviewRoundId: settlement.review_round_id })]
    );
    if (!inserted.rows[0] || reward.amount <= 0) return inserted.rows[0] || null;
    const ledgerEntry = [{ mode: 'earn', type: `task_settlement_${reward.role}`, taskId: settlement.task_id, tokens: reward.amount, tokenType, settlementId: settlement.settlement_uuid, creationDate: new Date().toISOString() }];
    await client.query(
      `UPDATE users SET cotokens = COALESCE(cotokens, 0) + $1,
         token_ledger = COALESCE(token_ledger, '[]'::jsonb) || $2::jsonb
       WHERE id = $3`, [reward.amount, JSON.stringify(ledgerEntry), reward.userId]
    );
    await client.query(
      `INSERT INTO token_transactions (sender_id, receiver_id, amount, reason, related_task_id, transaction_date, notes)
       VALUES (NULL, $1, $2, $3, $4, NOW(), $5)`,
      [reward.userId, reward.amount, `task_settlement_${reward.role}`, settlement.task_id, `Settlement ${settlement.settlement_uuid}`]
    );
    return inserted.rows[0];
  }

  async postSkillXp(client, settlement, contributorRewards) {
    const skill = (await client.query(`SELECT id, unlocked_users FROM skills WHERE id = $1 FOR UPDATE`, [settlement.skill_id])).rows[0];
    if (!skill) return [];
    const entries = asArray(skill.unlocked_users).map(entry => typeof entry === 'string' ? asObject(entry) : entry).filter(Boolean);
    const byUser = new Map(entries.map(entry => [Number(entry.user_id), { ...entry }]));
    const changes = [];
    for (const reward of contributorRewards) {
      const previous = byUser.get(reward.userId) || { user_id: reward.userId, exp: 0, level: 1 };
      const previousXp = Number(previous.exp || 0);
      const previousLevel = Number(previous.level || levelForXp(previousXp));
      const xpDelta = Math.max(0, Math.round(Number(reward.amount || 0)));
      const newXp = previousXp + xpDelta;
      const newLevel = levelForXp(newXp);
      const eventKey = `settlement:${settlement.settlement_uuid}:xp:${settlement.skill_id}:${reward.userId}`;
      const inserted = await client.query(
        `INSERT INTO skill_xp_events (
           settlement_id, task_id, user_id, skill_id, xp_delta,
           previous_xp, new_xp, previous_level, new_level, event_key
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (event_key) DO NOTHING RETURNING *`,
        [settlement.id, settlement.task_id, reward.userId, settlement.skill_id, xpDelta,
          previousXp, newXp, previousLevel, newLevel, eventKey]
      );
      if (inserted.rows[0]) {
        byUser.set(reward.userId, { ...previous, user_id: reward.userId, exp: newXp, level: newLevel });
        changes.push(inserted.rows[0]);
      }
    }
    await client.query(`UPDATE skills SET unlocked_users = $1::jsonb WHERE id = $2`, [JSON.stringify([...byUser.values()]), settlement.skill_id]);
    return changes;
  }

  async recordSettlementEvent(client, settlement, eventType, payload) {
    return client.query(
      `INSERT INTO task_settlement_events (settlement_id, task_id, event_type, event_key, payload)
       VALUES ($1,$2,$3,$4,$5::jsonb) ON CONFLICT (event_key) DO NOTHING`,
      [settlement.id, settlement.task_id, eventType, `settlement:${settlement.settlement_uuid}:${eventType}`, JSON.stringify(payload)]
    );
  }

  async writeOutbox(client, settlement, eventType, payload) {
    return client.query(
      `INSERT INTO task_settlement_outbox (settlement_id, event_type, event_key, payload)
       VALUES ($1,$2,$3,$4::jsonb) ON CONFLICT (event_key) DO NOTHING`,
      [settlement.id, eventType, `settlement:${settlement.settlement_uuid}:outbox:${eventType}`, JSON.stringify(payload)]
    );
  }

  async dispatchPendingOutbox() {
    const ids = (await this.pool.query(`SELECT DISTINCT settlement_id FROM task_settlement_outbox WHERE status IN ('pending','failed') LIMIT 100`)).rows;
    for (const row of ids) await this.dispatchOutbox(row.settlement_id);
  }

  async dispatchOutbox(settlementId) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const settlement = (await client.query(`SELECT * FROM task_settlements WHERE id = $1`, [settlementId])).rows[0];
      if (!settlement) { await client.query('COMMIT'); return; }
      const rows = (await client.query(
        `SELECT * FROM task_settlement_outbox WHERE settlement_id = $1 AND status <> 'delivered' ORDER BY id FOR UPDATE`, [settlement.id]
      )).rows;
      for (const row of rows) {
        const payload = asObject(row.payload);
        await client.query(
          `INSERT INTO domain_events (
             event_type, event_key, aggregate_type, aggregate_id, project_id,
             actor_user_id, correlation_id, causation_id, payload, occurred_at
           ) VALUES ($1,$2,'task',$3,$4,NULL,$5,$6,$7::jsonb,NOW())
           ON CONFLICT (event_key) DO NOTHING`,
          [row.event_type, row.event_key, String(settlement.task_id), settlement.project_id,
            `project:${settlement.project_id}`, `settlement:${settlement.settlement_uuid}`, JSON.stringify(payload)]
        );
        await client.query(
          `UPDATE task_settlement_outbox SET status = 'delivered', attempt_count = attempt_count + 1,
             delivered_at = NOW(), updated_at = NOW(), last_error = NULL WHERE id = $1`, [row.id]
        );
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      await this.pool.query(
        `UPDATE task_settlement_outbox SET status = 'failed', attempt_count = attempt_count + 1,
           last_error = $2, updated_at = NOW() WHERE settlement_id = $1 AND status <> 'delivered'`,
        [settlementId, String(error.message || error)]
      ).catch(() => null);
    } finally {
      client.release();
    }
  }

  async retry({ settlementId, authContext = {} }) {
    const row = (await this.pool.query(
      `UPDATE task_settlements SET status = 'queued', next_attempt_at = NULL,
         last_error_code = NULL, last_error_message = NULL, last_error_details = NULL, updated_at = NOW()
       WHERE (id::text = $1 OR settlement_uuid::text = $1)
         AND status IN ('retry_wait','failed') RETURNING id`, [String(settlementId)]
    )).rows[0];
    if (!row) throw this.error('SETTLEMENT_NOT_RETRYABLE', 'Settlement is not retryable.', 409);
    await this.enqueue(row.id);
    return this.hydrate(row.id, authContext);
  }

  async cancel({ settlementId, reason = 'Cancelled.', authContext = {} }) {
    const row = (await this.pool.query(
      `UPDATE task_settlements SET status = 'cancelled', cancelled_at = NOW(),
         last_error_code = 'SETTLEMENT_CANCELLED', last_error_message = $2, updated_at = NOW()
       WHERE (id::text = $1 OR settlement_uuid::text = $1)
         AND status IN ('pending','queued','retry_wait') RETURNING id`, [String(settlementId), String(reason).slice(0, 1000)]
    )).rows[0];
    if (!row) throw this.error('SETTLEMENT_NOT_CANCELLABLE', 'Settlement is not cancellable.', 409);
    return this.hydrate(row.id, authContext);
  }

  async markFailure(settlementId, error) {
    const retryable = error.retryable !== false && !String(error.code || '').includes('MISSING');
    const status = retryable ? 'retry_wait' : 'blocked';
    await this.pool.query(
      `UPDATE task_settlements SET status = $2, last_error_code = $3,
         last_error_message = $4, last_error_details = $5::jsonb,
         next_attempt_at = CASE WHEN $2 = 'retry_wait' THEN NOW() + INTERVAL '30 seconds' ELSE NULL END,
         updated_at = NOW()
       WHERE id::text = $1 OR settlement_uuid::text = $1`,
      [String(settlementId), status, error.code || 'SETTLEMENT_EXECUTION_FAILED', String(error.message || error), JSON.stringify(error.details || {})]
    ).catch(() => null);
  }

  async getByTask(taskId, authContext = {}) {
    const row = (await this.pool.query(`SELECT id FROM task_settlements WHERE task_id::text = $1 ORDER BY id DESC LIMIT 1`, [String(taskId)])).rows[0];
    return row ? this.hydrate(row.id, authContext) : null;
  }

  async getByReviewRound(reviewRoundId, authContext = {}) {
    const row = (await this.pool.query(`SELECT id FROM task_settlements WHERE review_round_id = $1 ORDER BY id DESC LIMIT 1`, [reviewRoundId])).rows[0];
    return row ? this.hydrate(row.id, authContext) : null;
  }

  async hydrate(settlementId) {
    const settlement = (await this.pool.query(
      `SELECT s.*, t.name AS task_name, t.status AS task_status, t.completed_at AS task_completed_at,
              p.name AS project_name, p.status AS project_status, p.completed_at AS project_completed_at
       FROM task_settlements s JOIN tasks t ON t.id = s.task_id JOIN projects p ON p.id = s.project_id
       WHERE s.id::text = $1 OR s.settlement_uuid::text = $1 LIMIT 1`, [String(settlementId)]
    )).rows[0];
    if (!settlement) return null;
    const [rewards, skills, completion, outbox] = await Promise.all([
      this.pool.query(`SELECT * FROM reward_ledger_events WHERE settlement_id = $1 ORDER BY id`, [settlement.id]),
      this.pool.query(`SELECT * FROM skill_xp_events WHERE settlement_id = $1 ORDER BY id`, [settlement.id]),
      this.pool.query(`SELECT * FROM task_completion_records WHERE settlement_id = $1 LIMIT 1`, [settlement.id]),
      this.pool.query(`SELECT status, COUNT(*)::int AS count FROM task_settlement_outbox WHERE settlement_id = $1 GROUP BY status`, [settlement.id])
    ]);
    const snapshot = asObject(settlement.result_snapshot);
    const reward = row => ({ amount: Number(row.amount), tokenType: row.token_type, postedAt: row.posted_at });
    const outboxCounts = Object.fromEntries(outbox.rows.map(row => [row.status, Number(row.count)]));
    const allRewards = rewards.rows;
    const lastError = settlement.last_error_code ? {
      code: settlement.last_error_code,
      message: settlement.last_error_message,
      retryable: settlement.status === 'retry_wait',
      details: asObject(settlement.last_error_details)
    } : null;
    return {
      settlementId: String(settlement.settlement_uuid),
      settlementRecordId: settlement.id,
      status: settlement.status,
      attemptCount: Number(settlement.attempt_count || 0),
      policyVersion: settlement.policy_version,
      task: { id: settlement.task_id, name: settlement.task_name, status: settlement.task_status, completedAt: settlement.task_completed_at },
      project: {
        id: settlement.project_id,
        name: settlement.project_name,
        completed: settlement.project_status === 'completed',
        completedAt: settlement.project_completed_at,
        remainingRequiredTasks: Number(snapshot.remainingRequiredTasks || 0)
      },
      rewards: {
        contributor: allRewards.filter(row => row.reward_role === 'contributor').map(reward),
        peerReviewers: allRewards.filter(row => row.reward_role === 'peer_reviewer').map(reward),
        pmReviewer: allRewards.filter(row => row.reward_role === 'pm_reviewer').map(reward)
      },
      skillChanges: skills.rows.map(row => ({
        skillId: row.skill_id, xpDelta: Number(row.xp_delta), previousXp: Number(row.previous_xp), newXp: Number(row.new_xp),
        previousLevel: Number(row.previous_level), newLevel: Number(row.new_level), levelChanged: Number(row.previous_level) !== Number(row.new_level)
      })),
      activatedTasks: asArray(snapshot.activatedTasks),
      storyEvent: { created: Boolean(snapshot.storyEventId), eventId: snapshot.storyEventId || null },
      completionRecord: completion.rows[0] ? { id: completion.rows[0].id, uuid: completion.rows[0].completion_uuid, completedAt: completion.rows[0].completed_at } : null,
      action: null,
      lastError,
      progress: {
        status: settlement.status,
        stages: ['Accepted review locked', 'Completion recorded', 'Rewards and skill XP posted', 'Dependencies activated', 'Chronicle and world events published'],
        eventCount: Object.values(outboxCounts).reduce((sum, count) => sum + count, 0)
      },
      effectSummary: {
        completionRecords: completion.rowCount,
        rewardEvents: rewards.rowCount,
        skillXpEvents: skills.rowCount,
        activatedTasks: asArray(snapshot.activatedTasks).length,
        outboxDelivered: outboxCounts.delivered || 0
      },
      copy: settlement.status === 'completed'
        ? 'Cerbanimo committed task completion and every configured consequence exactly once.'
        : lastError?.message || 'Completion settlement is pending.',
      allowedActions: {
        view: true,
        confirm: false,
        retry: ['retry_wait', 'failed'].includes(settlement.status),
        cancel: ['pending', 'queued', 'retry_wait'].includes(settlement.status),
        reconcile: settlement.status === 'completed' && (outboxCounts.delivered || 0) < 4
      }
    };
  }

  async listEvents({ projectId, after = 0, limit = 100 }) {
    const safeLimit = Math.min(250, Math.max(1, Number(limit || 100)));
    const rows = (await this.pool.query(
      `SELECT * FROM domain_events WHERE project_id = $1 AND sequence > $2 ORDER BY sequence ASC LIMIT $3`,
      [projectId, Number(after || 0), safeLimit]
    )).rows;
    return {
      events: rows.map(row => ({
        sequence: Number(row.sequence), id: row.event_uuid, eventType: row.event_type,
        aggregateType: row.aggregate_type, aggregateId: row.aggregate_id,
        projectId: row.project_id, communityId: row.community_id, payload: row.payload, timestamp: row.occurred_at
      })),
      nextCursor: rows.length ? Number(rows[rows.length - 1].sequence) : Number(after || 0)
    };
  }

  async lockAcceptedTask(client, taskId) {
    return (await client.query(
      `SELECT ar.id AS acceptance_record_id, ar.acceptance_uuid, ar.settlement_status,
              ar.review_round_id, ar.evidence_manifest_sha256,
              r.submission_actor_user_id, r.policy_snapshot AS review_policy_snapshot,
              t.id AS task_id, t.project_id, t.reward_tokens, t.settlement_policy AS task_settlement_policy,
              p.settlement_policy AS project_settlement_policy, p.community_id,
              c.name AS community_name, b.encounter_context
       FROM task_acceptance_records ar
       JOIN task_review_rounds r ON r.id = ar.review_round_id
       JOIN tasks t ON t.id = ar.task_id
       JOIN projects p ON p.id = t.project_id
       JOIN task_evidence_bundles b ON b.id = ar.bundle_id
       LEFT JOIN communities c ON c.id = p.community_id
       WHERE ar.task_id::text = $1 AND ar.settlement_status = 'pending'
       ORDER BY ar.id DESC LIMIT 1 FOR UPDATE OF ar`, [String(taskId)]
    )).rows[0] || null;
  }

  error(code, message, status = 500, retryable = true, details = {}) {
    const error = new Error(message);
    error.code = code;
    error.status = status;
    error.retryable = retryable;
    error.details = details;
    return error;
  }
}

export { TaskSettlementService };
export default new TaskSettlementService();
