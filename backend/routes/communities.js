import express from "express";
import pg from "pg";

const { Pool } = pg;
const router = express.Router();
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
});

/**
 * Calculates total or individual vote weight (including delegated votes).
 * @param {object} client - Postgres client from pool.connect().
 * @param {string} communityId - The community ID to filter by.
 * @param {string|number} [voterId] - Optional user ID whose weight to calculate.
 * @param {object} [delegations={}] - Optional delegations map: { delegatorId: delegateToId }
 * @returns {Promise<object>} Either { totalPossibleWeight } or { weight }
 **/
async function calculateVoteWeight(
  client,
  communityId,
  voterId = null,
  delegations = {}
) {
  if (voterId) {
    const userIdStr = voterId.toString();

    // Step 1: Find delegators who have delegated to this user
    const delegators = Object.entries(delegations)
      .filter(([, delegateTo]) => delegateTo === userIdStr)
      .map(([delegator]) => parseInt(delegator));

    const voterIds = [parseInt(voterId), ...delegators];

    // Step 2: Get token count per voter
    const { rows: tokenRows } = await client.query(
      `
      SELECT u.id, COALESCE(SUM((token_json->>'tokens')::numeric), 0) AS tokens
      FROM users u
      LEFT JOIN LATERAL (
        SELECT token_json
        FROM unnest(u.token_ledger) AS token_json
        WHERE token_json->>'type' = 'community'
        AND (token_json->>'id')::int = $2
      ) AS token_entries ON TRUE
      WHERE u.id = ANY($1::int[])
      GROUP BY u.id
      `,
      [voterIds, communityId]
    );

    // Step 3: Sum total weight for voter and their delegators
    const weight = tokenRows.reduce(
      (sum, row) => sum + parseFloat(row.tokens),
      0
    ) || 1;
    return { weight };
  } else {
    // Calculate total vote weight across all users in the community
    const { rows } = await client.query(
      `
      SELECT COALESCE(SUM((token_json->>'tokens')::numeric), 0) AS total_tokens
      FROM users u
      LEFT JOIN LATERAL (
        SELECT token_json
        FROM unnest(u.token_ledger) AS token_json
        WHERE token_json->>'type' = 'community'
        AND (token_json->>'id')::int = $1
      ) AS token_entries ON TRUE

      `,
      [communityId]
    );

    const totalPossibleWeight = parseFloat(rows[0]?.total_tokens || 
      (await client.query('SELECT ARRAY_LENGTH(members, 1) FROM communities WHERE id = $1', [communityId])).rows[0]?.array_length || 1);
    return { totalPossibleWeight };
  }
}

// Get all communities with optional search and pagination
router.get("/", async (req, res) => {
  const { search, page = 1 } = req.query;
  const client = await pool.connect();
  try {
    const limit = 10; // Number of communities per page
    const offset = (page - 1) * limit;
    const query = `
      WITH community_data AS (
        SELECT id, name, description, members, interest_tags, proposals, 
             approved_projects, vote_delegations
        FROM communities
        WHERE ($1::text IS NULL OR name ILIKE '%' || $1 || '%')
        ORDER BY name
        LIMIT $2 OFFSET $3
      )
      SELECT 
  c.*,
  COALESCE(
    (
      SELECT jsonb_agg(i.name)
      FROM interests i
      WHERE i.id = ANY(c.interest_tags)
    ),
    '[]'::jsonb
  ) as interest_names
      FROM community_data c
    `;
    const values = [search || null, limit, offset];
    const result = await client.query(query, values);

    // Transform the results to replace interest_tags with interest_names
    const communities = result.rows.map((row) => ({
      ...row,
      interest_tags: row.interest_names,
      interest_names: undefined, // Remove the extra field
    }));

    const totalCountQuery = `
      SELECT COUNT(*) FROM communities
      WHERE ($1::text IS NULL OR name ILIKE '%' || $1 || '%')
    `;
    const totalCountResult = await client.query(totalCountQuery, [
      search || null,
    ]);
    const totalCount = parseInt(totalCountResult.rows[0].count, 10);

    res.status(200).json({
      communities,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: parseInt(page, 10),
    });
  } catch (err) {
    console.error("Error fetching communities:", err);
    res.status(500).json({ error: "Failed to fetch communities" });
  } finally {
    client.release();
  }
});

// Get all communities a user is a member of
// (userId is passed in the request body)
router.get("/user/:userId", async (req, res) => {
  const { userId } = req.params;
  const client = await pool.connect();
  try {
    const query = `
        SELECT id, name, description, members, interest_tags, proposals,
              approved_projects, vote_delegations
        FROM communities
        WHERE $1::integer = ANY(members)
        ORDER BY name
      `;
    const values = [userId];
    const result = await client.query(query, values);
    res.json(result.rows); // This line was missing
  } catch (err) {
    console.error("Error fetching communities:", err);
    res.status(500).json({ error: "Failed to fetch communities" });
  } finally {
    client.release();
  }
});

//Create a new community
router.post("/", async (req, res) => {
  const { name, id, description, tags = [] } = req.body;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Convert tags to array if it's not already
    const tagArray = Array.isArray(tags) ? tags : [tags].filter(Boolean);

    const query = `
          INSERT INTO communities (name, description, members, interest_tags)
          VALUES ($1, $2, $3, $4) RETURNING id
      `;
    const values = [
      name,
      description,
      [id],
      tagArray.length > 0 ? tagArray : null, // Use null if empty array
    ];

    const result = await client.query(query, values);
    const communityId = result.rows[0].id;

    await client.query("COMMIT");
    res.status(201).json({ message: "Community created", communityId });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error creating community:", err);
    res.status(500).json({ error: "Failed to create community" });
  } finally {
    client.release();
  }
});

// Get a community by ID
router.get("/:communityId", async (req, res) => {
  const { communityId } = req.params;
  const client = await pool.connect();
  console.log("Fetching community with ID:", communityId); // Debug log
  try {
    const query = `
          WITH community_data AS (
              SELECT id, name, description, 
                     COALESCE(members, ARRAY[]::integer[]) as members, 
                     interest_tags, proposals, 
                     approved_projects, vote_delegations
              FROM communities 
              WHERE id = $1
          )
          SELECT 
              c.*,
              COALESCE(
                  (
                      SELECT jsonb_agg(i.name)
                      FROM interests i
                      WHERE i.id = ANY(c.interest_tags)
                  ),
                  '[]'::jsonb
              ) as interest_names
          FROM community_data c
      `;
    const result = await client.query(query, [communityId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Community not found" });
    }

    console.log("Community data:", result.rows[0]); // Debug log

    const community = {
      ...result.rows[0],
      interest_tags: result.rows[0].interest_names,
      interest_names: undefined,
    };

    res.status(200).json(community);
  } catch (err) {
    console.error("Error fetching community:", err);
    res.status(500).json({ error: "Failed to fetch community" });
  } finally {
    client.release();
  }
});

// Get the list of membership requests for a community
router.get("/:communityId/membership-requests", async (req, res) => {
  const { communityId } = req.params;
  const client = await pool.connect();
  try {
    const query = `
            SELECT user_id, votes FROM membership_requests WHERE community_id = $1
        `;
    const result = await client.query(query, [communityId]);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Error fetching membership requests:", err);
    res.status(500).json({ error: "Failed to fetch membership requests" });
  } finally {
    client.release();
  }
});

// Submit project to a community's proposals
router.post("/:communityId/submit/:projectId", async (req, res) => {
  const { communityId, projectId } = req.params;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Set community_id and token_pool on project
    await client.query(
      `UPDATE projects SET community_id = $1, token_pool = 0 WHERE id = $2`,
      [communityId, projectId]
    );

    // Add to proposals array if not already there
    await client.query(
      `UPDATE communities SET proposals = array_append(proposals, $1)
       WHERE id = $2 AND NOT proposals @> ARRAY[$1]::integer[]`,
      [projectId, communityId]
    );

    await client.query("COMMIT");
    res.status(200).json({ message: "Project submitted to community." });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Submit error:", err);
    res.status(500).json({ error: "Failed to submit project" });
  } finally {
    client.release();
  }
});

// Vote on adding a new member (vote = true/false)
router.post("/:communityId/vote/member/:requestUserId", async (req, res) => {
  const { communityId, requestUserId } = req.params;
  const { userId, vote } = req.body;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Cast the vote from this user
    await client.query(
      `UPDATE membership_requests SET votes = jsonb_set(
        COALESCE(votes, '{}'), $1::text[], to_jsonb($2::boolean), true
      ) WHERE community_id = $3 AND user_id = $4`,
      [[userId], vote, communityId, requestUserId]
    );

    // Fetch current votes
    const voteRes = await client.query(
      `SELECT votes FROM membership_requests WHERE community_id = $1 AND user_id = $2`,
      [communityId, requestUserId]
    );
    const votes = voteRes.rows[0]?.votes || {};

    // Tally vote weights
    let yesWeight = 0;
    const { totalPossibleWeight } = await calculateVoteWeight(
      client,
      communityId
    );

    for (const [voterId, val] of Object.entries(votes)) {
      if (val === true) {
        const { weight: w } = await calculateVoteWeight(
          client,
          communityId,
          voterId
        );
        yesWeight += w;
      }
    }

    const majorityReached = yesWeight / totalPossibleWeight > 0.5;

    if (majorityReached) {
      await client.query(
        `UPDATE communities SET members = array_append(members, $1) WHERE id = $2`,
        [requestUserId, communityId]
      );
      await client.query(
        `DELETE FROM membership_requests WHERE community_id = $1 AND user_id = $2`,
        [communityId, requestUserId]
      );
    }

    await client.query("COMMIT");
    res.status(200).json({
      message: "Vote recorded.",
      approved: majorityReached,
      currentVotes: votes,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Vote error:", err);
    res.status(500).json({ error: "Failed to cast vote" });
  } finally {
    client.release();
  }
});

// Vote on a proposal (vote = true/false)
router.post("/:communityId/vote/:projectId", async (req, res) => {
  const { communityId, projectId } = req.params;
  const { userId, vote } = req.body;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Cast the vote from this user
    await client.query(
      `UPDATE projects SET community_votes = jsonb_set(
        COALESCE(community_votes, '{}'), $1::text[], to_jsonb($2::boolean), true
      ) WHERE id = $3`,
      [[userId], vote, projectId]
    );

    // Fetch current votes
    const voteRes = await client.query(
      `SELECT community_votes FROM projects WHERE id = $1`,
      [projectId]
    );
    const votes = voteRes.rows[0]?.community_votes || {};

    let yesWeight = 0;
    let totalVoteWeight = 0;
    const { totalPossibleWeight } = await calculateVoteWeight(
      client,
      communityId
    );

    for (const [voterId, val] of Object.entries(votes)) {
      const { weight: w } = await calculateVoteWeight(
        client,
        communityId,
        voterId
      );
      totalVoteWeight += w;
      if (val === true) yesWeight += w;
    }

    const ratio = yesWeight / totalPossibleWeight;
    const turnout = totalVoteWeight / totalPossibleWeight;

    const majorityPassed = ratio > 0.5 && turnout >= 0.5;
    const majorityRejected = ratio < 0.5 && turnout >= 0.5;

    if (majorityPassed) {
      await client.query(
        `UPDATE communities
         SET proposals = array_remove(proposals, $1),
             approved_projects = array_append(approved_projects, $1)
         WHERE id = $2`,
        [projectId, communityId]
      );
      await client.query(`UPDATE projects SET token_pool = 400 WHERE id = $1`, [
        projectId,
      ]);
    }

    if (majorityRejected) {
      await client.query(
        `UPDATE communities SET proposals = array_remove(proposals, $1) WHERE id = $2`,
        [projectId, communityId]
      );
      await client.query(
        `UPDATE projects SET token_pool = 80, community_id = NULL, community_votes = NULL WHERE id = $1`,
        [projectId]
      );
    }

    await client.query("COMMIT");
    res.status(200).json({
      message: "Vote recorded.",
      passed: majorityPassed,
      failed: majorityRejected,
      currentVotes: votes,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Vote error:", err);
    res.status(500).json({ error: "Failed to cast vote" });
  } finally {
    client.release();
  }
});

// Set a user's vote_delegations jsonb field
router.post("/:communityId/delegate/:userId", async (req, res) => {
  const { communityId, userId } = req.params;
  const { delegateTo } = req.body;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Fetch members
    const { rows } = await client.query(
      `SELECT members FROM communities WHERE id = $1`,
      [communityId]
    );
    const community = rows[0];
    const members = community.members || [];

    if (!members.includes(Number(userId))) {
      return res
        .status(403)
        .json({ error: "User is not a member of this community" });
    }

    // Set delegation
    await client.query(
      `UPDATE communities SET vote_delegations = jsonb_set(
          COALESCE(vote_delegations, '{}'),
          $1::text[],
          to_jsonb($2::text),
          true
        ) WHERE id = $3`,
      [[userId.toString()], delegateTo, communityId]
    );

    await client.query("COMMIT");
    res.status(200).json({ message: "Vote delegation set." });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Delegation error:", err);
    res.status(500).json({ error: "Failed to set vote delegation" });
  } finally {
    client.release();
  }
});

// revoke a user's vote_delegations jsonb field
router.post("/:communityId/revoke/:userId", async (req, res) => {
  const { communityId, userId } = req.params;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Fetch members
    const { rows } = await client.query(
      `SELECT members FROM communities WHERE id = $1`,
      [communityId]
    );
    const community = rows[0];
    const members = community.members || [];

    if (!members.includes(Number(userId))) {
      return res
        .status(403)
        .json({ error: "User is not a member of this community" });
    }

    // Revoke delegation
    await client.query(
      `UPDATE communities SET vote_delegations = vote_delegations - $1
       WHERE id = $2`,
      [userId.toString(), communityId]
    );

    await client.query("COMMIT");
    res.status(200).json({ message: "Vote delegation revoked." });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Revoke error:", err);
    res.status(500).json({ error: "Failed to revoke vote delegation" });
  } finally {
    client.release();
  }
});

// Request to join a community
router.post("/:communityId/request", async (req, res) => {
  const { communityId } = req.params;
  const { userId } = req.body;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Check for existing request
    const checkQuery = `
      SELECT id FROM membership_requests 
      WHERE community_id = $1 AND user_id = $2
    `;
    const checkResult = await client.query(checkQuery, [communityId, userId]);

    if (checkResult.rows.length > 0) {
      await client.query("ROLLBACK");
      return res
        .status(400)
        .json({ error: "Membership request already exists" });
    }

    // Insert new request
    const insertQuery = `
      INSERT INTO membership_requests (community_id, user_id)
      VALUES ($1, $2) RETURNING id
    `;
    const result = await client.query(insertQuery, [communityId, userId]);
    const requestId = result.rows[0].id;

    await client.query("COMMIT");
    res
      .status(201)
      .json({ message: "Membership request submitted", requestId });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error requesting membership:", err);
    res.status(500).json({ error: "Failed to request membership" });
  } finally {
    client.release();
  }
});

export default router;
