import pool from '../db.js';

const defaultTokenEntry = ({ communityId = null, projectId = null, tokenValue = 0, cotokenValue = 0, label = 'Discord interaction' } = {}) => ({
  label,
  communityToken: communityId ? {
    label: 'Community Token',
    communityId,
    tokenValue
  } : null,
  projectToken: projectId ? {
    label: 'Project Token',
    projectId,
    tokenValue
  } : null,
  cotokens: {
    label: 'Cotokens',
    cotokenValue
  },
  createdAt: new Date().toISOString()
});

class PotentialUserService {
  async recordInteraction({
    discordUserId,
    discordUsername,
    communityId = null,
    actionType,
    payload = {},
    tokenEntry = null,
    client = pool
  }) {
    if (!discordUserId) return null;

    const action = {
      type: actionType,
      payload,
      createdAt: new Date().toISOString()
    };

    const tokens = tokenEntry ? [tokenEntry] : [];

    const result = await client.query(
      `INSERT INTO potential_users (
         discord_user_id,
         discord_username,
         accumulated_tokens,
         action_history,
         community_id,
         first_seen_at,
         last_active_at
       )
       VALUES ($1, $2, $3::jsonb, $4::jsonb, $5, NOW(), NOW())
       ON CONFLICT (discord_user_id) DO UPDATE
       SET discord_username = COALESCE(EXCLUDED.discord_username, potential_users.discord_username),
           accumulated_tokens = potential_users.accumulated_tokens || EXCLUDED.accumulated_tokens,
           action_history = potential_users.action_history || EXCLUDED.action_history,
           community_id = COALESCE(EXCLUDED.community_id, potential_users.community_id),
           last_active_at = NOW()
       RETURNING *`,
      [
        discordUserId,
        discordUsername,
        JSON.stringify(tokens),
        JSON.stringify([action]),
        communityId
      ]
    );

    return result.rows[0];
  }

  async recordTaskInterest({ discordUserId, discordUsername, taskId, communityId = null, projectId = null, client = pool }) {
    return this.recordInteraction({
      discordUserId,
      discordUsername,
      communityId,
      actionType: 'task_interest',
      payload: { taskId, projectId },
      tokenEntry: defaultTokenEntry({
        communityId,
        projectId,
        tokenValue: 1,
        cotokenValue: 0,
        label: 'Task interest signal'
      }),
      client
    });
  }

  async migrateToUser(discordUserId, userId, client = pool) {
    if (!discordUserId || !userId) return null;

    const potentialResult = await client.query(
      'SELECT * FROM potential_users WHERE discord_user_id = $1 FOR UPDATE',
      [discordUserId]
    );

    if (potentialResult.rows.length === 0) return null;

    const potential = potentialResult.rows[0];
    const accumulatedTokens = Array.isArray(potential.accumulated_tokens) ? potential.accumulated_tokens : [];
    const actionHistory = Array.isArray(potential.action_history) ? potential.action_history : [];
    const cotokenTotal = accumulatedTokens.reduce((sum, entry) => {
      const value = entry?.cotokens?.cotokenValue ?? entry?.cotokenValue ?? 0;
      return sum + Number(value || 0);
    }, 0);

    if (cotokenTotal > 0) {
      await client.query(
        'UPDATE users SET cotokens = cotokens + $1 WHERE id = $2',
        [cotokenTotal, userId]
      );
    }

    if (accumulatedTokens.length > 0 || actionHistory.length > 0) {
      const ledgerEntry = {
        mode: 'earn',
        type: 'discord_potential_user_migration',
        tokens: cotokenTotal,
        accumulatedTokens,
        actionHistory,
        creationDate: new Date().toISOString()
      };
      await client.query(
        `UPDATE users
         SET token_ledger = array_append(COALESCE(token_ledger, '{}'), $1::jsonb)
         WHERE id = $2`,
        [JSON.stringify(ledgerEntry), userId]
      );
    }

    await client.query('DELETE FROM potential_users WHERE discord_user_id = $1', [discordUserId]);

    return {
      cotokensTransferred: cotokenTotal,
      actionCount: actionHistory.length,
      tokenCount: accumulatedTokens.length
    };
  }
}

export { defaultTokenEntry };
export default new PotentialUserService();
