import pool from '../db.js';

const MARKETPLACE_BURN_RATE = 0.02;

/**
 * Calculates burn and updates community treasury and token_burns table.
 * @param {Object} client - DB client
 * @param {number} amount - Transaction amount
 * @param {string} type - transaction_type
 * @param {number} transactionId - ID of the transaction
 * @param {string} burnedFrom - 'user' or 'community'
 * @param {number} entityId - user_id or community_id
 * @param {number} communityId - community_id the burn belongs to
 * @returns {number} - The amount burned
 */
export async function applyBurn(client, amount, type, transactionId, burnedFrom, entityId, communityId) {
  const burnAmount = Math.floor(amount * MARKETPLACE_BURN_RATE);
  if (burnAmount <= 0) return 0;

  await client.query(
    `INSERT INTO token_burns (transaction_type, transaction_id, burned_amount, burned_from, entity_id, community_id)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [type, transactionId, burnAmount, burnedFrom, entityId, communityId]
  );

  if (communityId) {
    await client.query(
      'UPDATE community_treasury SET total_burned = total_burned + $1 WHERE community_id = $2',
      [burnAmount, communityId]
    );
  }

  return burnAmount;
}

export { MARKETPLACE_BURN_RATE };
