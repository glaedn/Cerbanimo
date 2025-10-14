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
 * @param {string} realmId - The realm ID to filter by.
 * @param {string|number} [voterId] - Optional user ID whose weight to calculate.
 * @param {object} [delegations={}] - Optional delegations map: { delegatorId: delegateToId }
 * @returns {Promise<object>} Either { totalPossibleWeight } or { weight }
 **/
async function calculateVoteWeight(
  client,
  realmId,
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
        WHERE token_json->>'type' = 'realm'
        AND (token_json->>'id')::int = $2
      ) AS token_entries ON TRUE
      WHERE u.id = ANY($1::int[])
      GROUP BY u.id
      `,
      [voterIds, realmId]
    );

    // Step 3: Sum total weight for voter and their delegators
    const weight = tokenRows.reduce(
      (sum, row) => sum + parseFloat(row.tokens),
      0
    ) || 1;
    return { weight };
  } else {
    // Calculate total vote weight across all users in the realm
    const { rows } = await client.query(
      `
      SELECT COALESCE(SUM((token_json->>'tokens')::numeric), 0) AS total_tokens
      FROM users u
      LEFT JOIN LATERAL (
        SELECT token_json
        FROM unnest(u.token_ledger) AS token_json
        WHERE token_json->>'type' = 'realm'
        AND (token_json->>'id')::int = $1
      ) AS token_entries ON TRUE

      `,
      [realmId]
    );

    const totalPossibleWeight = parseFloat(rows[0]?.total_tokens ||
      (await client.query('SELECT ARRAY_LENGTH(members, 1) FROM realms WHERE id = $1', [realmId])).rows[0]?.array_length || 1);
    return { totalPossibleWeight };
  }
}

// Get all realms with optional search and pagination
router.get("/", async (req, res) => {
  const { search, page = 1 } = req.query;
  const client = await pool.connect();
  try {
    const limit = 10; // Number of realms per page
    const offset = (page - 1) * limit;
    const query = `
      WITH realm_data AS (
        SELECT id, name, description, members, interest_tags, proposals,
             approved_intentions, vote_delegations
        FROM realms
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
      FROM realm_data c
    `;
    const values = [search || null, limit, offset];
    const result = await client.query(query, values);

    // Transform the results to replace interest_tags with interest_names
    const realms = result.rows.map((row) => ({
      ...row,
      interest_tags: row.interest_names,
      interest_names: undefined, // Remove the extra field
    }));

    const totalCountQuery = `
      SELECT COUNT(*) FROM realms
      WHERE ($1::text IS NULL OR name ILIKE '%' || $1 || '%')
    `;
    const totalCountResult = await client.query(totalCountQuery, [
      search || null,
    ]);
    const totalCount = parseInt(totalCountResult.rows[0].count, 10);

    res.status(200).json({
      realms,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: parseInt(page, 10),
    });
  } catch (err) {
    console.error("Error fetching realms:", err);
    res.status(500).json({ error: "Failed to fetch realms" });
  } finally {
    client.release();
  }
});

// Get realm scores for all users
router.get("/:realmId/scores", async (req, res) => {
  const { realmId } = req.params;
  const client = await pool.connect();

  try {
    const result = await client.query(
      "SELECT id, username, profile_picture, token_ledger FROM users"
    );
    const users = result.rows;
    const realmIdInt = parseInt(realmId, 10);

    if (isNaN(realmIdInt)) {
      return res.status(400).json({ error: "Invalid realm ID format" });
    }

    const userScores = users.map((user) => {
      let realmScore = 0;
      if (user.token_ledger && Array.isArray(user.token_ledger)) {
        user.token_ledger.forEach((entry) => {
          try {
            const record = typeof entry === 'string' ? JSON.parse(entry) : entry;
            if (
              record &&
              record.type === "realm" &&
              record.id === realmIdInt
            ) {
              realmScore += record.tokens || 0;
            }
          } catch (parseError) {
            console.error("Failed to parse token_ledger entry:", entry, parseError);
            // Optionally, decide if this error should affect the response
            // For now, we'll just log it and continue, effectively skipping malformed entries
          }
        });
      }
      return {
        id: user.id,
        username: user.username,
        profile_picture: user.profile_picture,
        realmScore,
      };
    });

    res.status(200).json(userScores);
  } catch (err) {
    console.error("Error fetching user scores for realm:", err);
    res.status(500).json({ error: "Failed to fetch user scores" });
  } finally {
    client.release();
  }
});

// Get all realms a user is a member of
// (userId is passed in the request body)
router.get("/user/:userId", async (req, res) => {
  const { userId } = req.params;
  const client = await pool.connect();
  try {
    const query = `
        SELECT id, name, description, members, interest_tags, proposals,
              approved_intentions, vote_delegations
        FROM realms
        WHERE $1::integer = ANY(members)
        ORDER BY name
      `;
    const values = [userId];
    const result = await client.query(query, values);
    res.json(result.rows); // This line was missing
  } catch (err) {
    console.error("Error fetching realms:", err);
    res.status(500).json({ error: "Failed to fetch realms" });
  } finally {
    client.release();
  }
});

//Create a new realm
router.post("/", async (req, res) => {
  const { name, id, description, tags = [] } = req.body;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Convert tags to array if it's not already
    const tagArray = Array.isArray(tags) ? tags : [tags].filter(Boolean);

    const query = `
          INSERT INTO realms (name, description, members, interest_tags)
          VALUES ($1, $2, $3, $4) RETURNING id
      `;
    const values = [
      name,
      description,
      [id],
      tagArray.length > 0 ? tagArray : null, // Use null if empty array
    ];

    const result = await client.query(query, values);
    const realmId = result.rows[0].id;

    await client.query("COMMIT");
    res.status(201).json({ message: "Realm created", realmId });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error creating realm:", err);
    res.status(500).json({ error: "Failed to create realm" });
  } finally {
    client.release();
  }
});

// Get a realm by ID
router.get("/:realmId", async (req, res) => {
  const { realmId } = req.params;
  const client = await pool.connect();
  console.log("Fetching realm with ID:", realmId); // Debug log
  try {
    const query = `
          WITH realm_data AS (
              SELECT id, name, description,
                     COALESCE(members, ARRAY[]::integer[]) as members,
                     interest_tags, proposals,
                     approved_intentions, vote_delegations, phase
              FROM realms
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
          FROM realm_data c
      `;
    const result = await client.query(query, [realmId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Realm not found" });
    }

    console.log("Realm data:", result.rows[0]); // Debug log

    const realm = {
      ...result.rows[0],
      interest_tags: result.rows[0].interest_names,
      interest_names: undefined,
    };

    res.status(200).json(realm);
  } catch (err) {
    console.error("Error fetching realm:", err);
    res.status(500).json({ error: "Failed to fetch realm" });
  } finally {
    client.release();
  }
});

// Update a realm's phase
router.put("/:realmId/phase", async (req, res) => {
  const { realmId } = req.params;
  const { phase, userId } = req.body;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Check if user is a member of the realm
    const memberCheck = await client.query(
      `SELECT 1 FROM realms WHERE id = $1 AND $2 = ANY(members)`,
      [realmId, userId]
    );

    if (memberCheck.rows.length === 0) {
      return res
        .status(403)
        .json({ error: "User is not a member of this realm" });
    }

    const query = `
      UPDATE realms
      SET phase = $1
      WHERE id = $2
      RETURNING *;
    `;
    const result = await client.query(query, [phase, realmId]);
    await client.query("COMMIT");
    res.status(200).json(result.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error updating realm phase:", err);
    res.status(500).json({ error: "Failed to update realm phase" });
  } finally {
    client.release();
  }
});

// Get the list of membership requests for a realm
router.get("/:realmId/membership-requests", async (req, res) => {
  const { realmId } = req.params;
  const client = await pool.connect();
  try {
    const query = `
            SELECT user_id, votes FROM membership_requests WHERE realm_id = $1
        `;
    const result = await client.query(query, [realmId]);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Error fetching membership requests:", err);
    res.status(500).json({ error: "Failed to fetch membership requests" });
  } finally {
    client.release();
  }
});

// Submit intention to a realm's proposals
router.post("/:realmId/submit/:intentionId", async (req, res) => {
  const { realmId, intentionId } = req.params;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Set realm_id and token_pool on intention
    await client.query(
      `UPDATE intentions SET realm_id = $1, token_pool = 0 WHERE id = $2`,
      [realmId, intentionId]
    );

    // Add to proposals array if not already there
    await client.query(
      `UPDATE realms SET proposals = array_append(proposals, $1)
       WHERE id = $2 AND NOT proposals @> ARRAY[$1]::integer[]`,
      [intentionId, realmId]
    );

    await client.query("COMMIT");
    res.status(200).json({ message: "Intention submitted to realm." });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Submit error:", err);
    res.status(500).json({ error: "Failed to submit intention" });
  } finally {
    client.release();
  }
});

// Vote on adding a new member (vote = true/false)
router.post("/:realmId/vote/member/:requestUserId", async (req, res) => {
  const { realmId, requestUserId } = req.params;
  const { userId, vote } = req.body;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Cast the vote from this user
    await client.query(
      `UPDATE membership_requests SET votes = jsonb_set(
        COALESCE(votes, '{}'), $1::text[], to_jsonb($2::boolean), true
      ) WHERE realm_id = $3 AND user_id = $4`,
      [[userId], vote, realmId, requestUserId]
    );

    // Fetch current votes
    const voteRes = await client.query(
      `SELECT votes FROM membership_requests WHERE realm_id = $1 AND user_id = $2`,
      [realmId, requestUserId]
    );
    const votes = voteRes.rows[0]?.votes || {};

    // Tally vote weights
    let yesWeight = 0;
    const { totalPossibleWeight } = await calculateVoteWeight(
      client,
      realmId
    );

    for (const [voterId, val] of Object.entries(votes)) {
      if (val === true) {
        const { weight: w } = await calculateVoteWeight(
          client,
          realmId,
          voterId
        );
        yesWeight += w;
      }
    }

    const majorityReached = yesWeight / totalPossibleWeight > 0.5;

    if (majorityReached) {
      await client.query(
        `UPDATE realms SET members = array_append(members, $1) WHERE id = $2`,
        [requestUserId, realmId]
      );
      await client.query(
        `DELETE FROM membership_requests WHERE realm_id = $1 AND user_id = $2`,
        [realmId, requestUserId]
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
router.post("/:realmId/vote/:intentionId", async (req, res) => {
  const { realmId, intentionId } = req.params;
  const { userId, vote } = req.body;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Cast the vote from this user
    await client.query(
      `UPDATE intentions SET realm_votes = jsonb_set(
        COALESCE(realm_votes, '{}'), $1::text[], to_jsonb($2::boolean), true
      ) WHERE id = $3`,
      [[userId], vote, intentionId]
    );

    // Fetch current votes
    const voteRes = await client.query(
      `SELECT realm_votes FROM intentions WHERE id = $1`,
      [intentionId]
    );
    const votes = voteRes.rows[0]?.realm_votes || {};

    let yesWeight = 0;
    let totalVoteWeight = 0;
    const { totalPossibleWeight } = await calculateVoteWeight(
      client,
      realmId
    );

    for (const [voterId, val] of Object.entries(votes)) {
      const { weight: w } = await calculateVoteWeight(
        client,
        realmId,
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
        `UPDATE realms
         SET proposals = array_remove(proposals, $1),
             approved_intentions = array_append(approved_intentions, $1)
         WHERE id = $2`,
        [intentionId, realmId]
      );
      await client.query(`UPDATE intentions SET token_pool = 400 WHERE id = $1`, [
        intentionId,
      ]);
    }

    if (majorityRejected) {
      await client.query(
        `UPDATE realms SET proposals = array_remove(proposals, $1) WHERE id = $2`,
        [intentionId, realmId]
      );
      await client.query(
        `UPDATE intentions SET token_pool = 80, realm_id = NULL, realm_votes = NULL WHERE id = $1`,
        [intentionId]
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
router.post("/:realmId/delegate/:userId", async (req, res) => {
  const { realmId, userId } = req.params;
  const { delegateTo } = req.body;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Fetch members
    const { rows } = await client.query(
      `SELECT members FROM realms WHERE id = $1`,
      [realmId]
    );
    const realm = rows[0];
    const members = realm.members || [];

    if (!members.includes(Number(userId))) {
      return res
        .status(403)
        .json({ error: "User is not a member of this realm" });
    }

    // Set delegation
    await client.query(
      `UPDATE realms SET vote_delegations = jsonb_set(
          COALESCE(vote_delegations, '{}'),
          $1::text[],
          to_jsonb($2::text),
          true
        ) WHERE id = $3`,
      [[userId.toString()], delegateTo, realmId]
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
router.post("/:realmId/revoke/:userId", async (req, res) => {
  const { realmId, userId } = req.params;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Fetch members
    const { rows } = await client.query(
      `SELECT members FROM realms WHERE id = $1`,
      [realmId]
    );
    const realm = rows[0];
    const members = realm.members || [];

    if (!members.includes(Number(userId))) {
      return res
        .status(403)
        .json({ error: "User is not a member of this realm" });
    }

    // Revoke delegation
    await client.query(
      `UPDATE realms SET vote_delegations = vote_delegations - $1
       WHERE id = $2`,
      [userId.toString(), realmId]
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

// Request to join a realm
router.post("/:realmId/request", async (req, res) => {
  const { realmId } = req.params;
  const { userId } = req.body;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Check for existing request
    const checkQuery = `
      SELECT id FROM membership_requests
      WHERE realm_id = $1 AND user_id = $2
    `;
    const checkResult = await client.query(checkQuery, [realmId, userId]);

    if (checkResult.rows.length > 0) {
      await client.query("ROLLBACK");
      return res
        .status(400)
        .json({ error: "Membership request already exists" });
    }

    // Insert new request
    const insertQuery = `
      INSERT INTO membership_requests (realm_id, user_id)
      VALUES ($1, $2) RETURNING id
    `;
    const result = await client.query(insertQuery, [realmId, userId]);
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

// Get resonance data for all realms
router.get("/resonance", async (req, res) => {
  try {
    const alignmentScores = await calculateRealmAlignment();
    res.status(200).json(alignmentScores);
  } catch (err) {
    console.error("Error fetching realm resonance:", err);
    res.status(500).json({ error: "Failed to fetch realm resonance" });
  }
});

const calculateRealmAlignment = async () => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const realmsResult = await client.query('SELECT id, approved_intentions FROM realms');
        const realms = realmsResult.rows;

        const alignmentScores = [];

        for (let i = 0; i < realms.length; i++) {
            for (let j = i + 1; j < realms.length; j++) {
                const realm1 = realms[i];
                const realm2 = realms[j];

                const intentions1 = new Set(realm1.approved_intentions);
                const intentions2 = new Set(realm2.approved_intentions);

                const intersection = new Set([...intentions1].filter(x => intentions2.has(x)));
                const union = new Set([...intentions1, ...intentions2]);

                const alignment = union.size > 0 ? intersection.size / union.size : 0;

                alignmentScores.push({
                    source: realm1.id,
                    target: realm2.id,
                    alignment: alignment
                });
            }
        }

        await client.query('COMMIT');
        return alignmentScores;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

export default router;