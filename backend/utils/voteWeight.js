/**
 * Calculates total or individual vote weight (including delegated votes) for a community.
 * @param {object} client - Postgres client from pool.connect().
 * @param {string|number} communityId - The community ID to filter by.
 * @param {string|number} [voterId] - Optional user ID whose weight to calculate.
 * @param {object} [delegations={}] - Optional delegations map: { delegatorId: delegateToId }
 * @returns {Promise<object>} Either { totalPossibleWeight } or { weight }
 **/
export async function calculateVoteWeight(
  client,
  communityId,
  voterId = null,
  delegations = {}
) {
  const communityIdInt = parseInt(communityId, 10);
  if (voterId) {
    const userIdStr = voterId.toString();

    // Step 1: Find delegators who have delegated to this user
    const delegators = Object.entries(delegations)
      .filter(([, delegateTo]) => delegateTo === userIdStr)
      .map(([delegator]) => parseInt(delegator));

    const voterIds = [parseInt(voterId), ...delegators];

    // Step 2: Get token count per voter from their token_ledger
    const { rows: tokenRows } = await client.query(
      `
      SELECT u.id,
             COALESCE(SUM((token_json->>'tokens')::numeric) FILTER (WHERE COALESCE(token_json->>'mode', 'earn') IN ('earn', 'receive')), 0) AS tokens
      FROM users u
      LEFT JOIN LATERAL (
        SELECT token_json
        FROM unnest(u.token_ledger) AS token_json
        WHERE (token_json->>'type' = 'community' OR token_json->>'type' = 'community_task_reward' OR token_json->>'type' = 'community_task_bonus')
        AND (token_json->>'id')::int = $2
      ) AS token_entries ON TRUE
      WHERE u.id = ANY($1::int[])
      GROUP BY u.id
      `,
      [voterIds, communityIdInt]
    );

    // Step 3: Sum total weight for voter and their delegators
    // Fallback to 1 if no tokens to ensure every member has at least some baseline weight
    const weight = tokenRows.reduce(
      (sum, row) => sum + parseFloat(row.tokens),
      0
    ) || 1;
    return { weight };
  } else {
    // Calculate total vote weight across all users in the community
    const { rows } = await client.query(
      `
      SELECT COALESCE(SUM((token_json->>'tokens')::numeric) FILTER (WHERE COALESCE(token_json->>'mode', 'earn') IN ('earn', 'receive')), 0) AS total_tokens
      FROM users u
      LEFT JOIN LATERAL (
        SELECT token_json
        FROM unnest(u.token_ledger) AS token_json
        WHERE (token_json->>'type' = 'community' OR token_json->>'type' = 'community_task_reward' OR token_json->>'type' = 'community_task_bonus')
        AND (token_json->>'id')::int = $1
      ) AS token_entries ON TRUE
      `,
      [communityIdInt]
    );

    const totalPossibleWeight = parseFloat(rows[0]?.total_tokens ||
      (await client.query('SELECT ARRAY_LENGTH(members, 1) FROM communities WHERE id = $1', [communityIdInt])).rows[0]?.array_length || 1);

    return { totalPossibleWeight: Math.max(totalPossibleWeight, 1) };
  }
}
