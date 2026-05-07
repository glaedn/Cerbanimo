import express from "express";
import pool from "../db.js";

const router = express.Router();

import { calculateVoteWeight } from "../utils/voteWeight.js";

// Get all communities with optional search and pagination
router.get("/", async (req, res) => {
  const { search, page = 1 } = req.query;
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
    const result = await pool.query(query, values);

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
    const totalCountResult = await pool.query(totalCountQuery, [
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
  }
});

// Get community scores for all users
router.get("/:communityId/scores", async (req, res) => {
  const { communityId } = req.params;

  try {
    const result = await pool.query(
      "SELECT id, username, profile_picture, token_ledger FROM users"
    );
    const users = result.rows;
    const communityIdInt = parseInt(communityId, 10);

    if (isNaN(communityIdInt)) {
      return res.status(400).json({ error: "Invalid community ID format" });
    }

    const userScores = users.map((user) => {
      let communityScore = 0;
      if (user.token_ledger && Array.isArray(user.token_ledger)) {
        user.token_ledger.forEach((entry) => {
          try {
            const record = typeof entry === 'string' ? JSON.parse(entry) : entry;
            const mode = record.mode || 'earn';
            if (
              record &&
              record.type === "community" &&
              record.id === communityIdInt &&
              (mode === 'earn' || mode === 'receive')
            ) {
              communityScore += record.tokens || 0;
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
        communityScore,
      };
    });

    res.status(200).json(userScores);
  } catch (err) {
    console.error("Error fetching user scores for community:", err);
    res.status(500).json({ error: "Failed to fetch user scores" });
  }
});

// Get all communities a user is a member of
// (userId is passed in the request body)
router.get("/user/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const query = `
        SELECT id, name, description, members, interest_tags, proposals,
              approved_projects, vote_delegations
        FROM communities
        WHERE $1::integer = ANY(members)
        ORDER BY name
      `;
    const values = [userId];
    const result = await pool.query(query, values);
    res.json(result.rows); // This line was missing
  } catch (err) {
    console.error("Error fetching communities:", err);
    res.status(500).json({ error: "Failed to fetch communities" });
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

    // Emit community.joined event for the creator
    const CivicEventService = (await import('../services/CivicEventService.js')).default;
    await CivicEventService.recordEvent({
      eventType: 'community.joined',
      actorId: id,
      entityType: 'community',
      entityId: communityId,
      payload: { role: 'creator' },
      correlationId: `community:${communityId}`
    }, client);

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
              ) as interest_names,
              COALESCE(
                  (
                      SELECT array_agg(DISTINCT cm_proj.entity_id)
                      FROM constellation_members cm_proj
                      JOIN constellation_members cm_comm ON cm_proj.constellation_id = cm_comm.constellation_id
                      WHERE cm_comm.entity_id = c.id
                      AND cm_comm.entity_type = 'community'
                      AND cm_proj.entity_type = 'project'
                  ),
                  ARRAY[]::integer[]
              ) as shared_project_ids
          FROM community_data c
      `;
    const result = await pool.query(query, [communityId]);
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
  }
});

// Get the list of membership requests for a community
router.get("/:communityId/membership-requests", async (req, res) => {
  const { communityId } = req.params;
  try {
    const query = `
            SELECT user_id, votes FROM membership_requests WHERE community_id = $1
        `;
    const result = await pool.query(query, [communityId]);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Error fetching membership requests:", err);
    res.status(500).json({ error: "Failed to fetch membership requests" });
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

      // Emit community.joined event
      const CivicEventService = (await import('../services/CivicEventService.js')).default;
      await CivicEventService.recordEvent({
        eventType: 'community.joined',
        actorId: requestUserId,
        entityType: 'community',
        entityId: communityId,
        payload: { role: 'member' },
        correlationId: `community:${communityId}`
      }, client);

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
      await client.query(`UPDATE projects SET token_pool = 400, status = 'active' WHERE id = $1`, [
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

  try {
    // Fetch members
    const { rows } = await pool.query(
      `SELECT members FROM communities WHERE id = $1`,
      [communityId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Community not found" });
    }
    const community = rows[0];
    const members = community.members || [];

    if (!members.includes(Number(userId))) {
      return res
        .status(403)
        .json({ error: "User is not a member of this community" });
    }

    // Set delegation
    await pool.query(
      `UPDATE communities SET vote_delegations = jsonb_set(
          COALESCE(vote_delegations, '{}'),
          $1::text[],
          to_jsonb($2::text),
          true
        ) WHERE id = $3`,
      [[userId.toString()], delegateTo, communityId]
    );

    res.status(200).json({ message: "Vote delegation set." });
  } catch (err) {
    console.error("Delegation error:", err);
    res.status(500).json({ error: "Failed to set vote delegation" });
  }
});

// revoke a user's vote_delegations jsonb field
router.post("/:communityId/revoke/:userId", async (req, res) => {
  const { communityId, userId } = req.params;

  try {
    // Fetch members
    const { rows } = await pool.query(
      `SELECT members FROM communities WHERE id = $1`,
      [communityId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Community not found" });
    }
    const community = rows[0];
    const members = community.members || [];

    if (!members.includes(Number(userId))) {
      return res
        .status(403)
        .json({ error: "User is not a member of this community" });
    }

    // Revoke delegation
    await pool.query(
      `UPDATE communities SET vote_delegations = vote_delegations - $1
       WHERE id = $2`,
      [userId.toString(), communityId]
    );

    res.status(200).json({ message: "Vote delegation revoked." });
  } catch (err) {
    console.error("Revoke error:", err);
    res.status(500).json({ error: "Failed to revoke vote delegation" });
  }
});

// Request to join a community
router.post("/:communityId/request", async (req, res) => {
  const { communityId } = req.params;
  const { userId } = req.body;

  try {
    // Check for existing request
    const checkQuery = `
      SELECT id FROM membership_requests 
      WHERE community_id = $1 AND user_id = $2
    `;
    const checkResult = await pool.query(checkQuery, [communityId, userId]);

    if (checkResult.rows.length > 0) {
      return res
        .status(400)
        .json({ error: "Membership request already exists" });
    }

    // Insert new request
    const insertQuery = `
      INSERT INTO membership_requests (community_id, user_id)
      VALUES ($1, $2) RETURNING id
    `;
    const result = await pool.query(insertQuery, [communityId, userId]);
    const requestId = result.rows[0].id;

    res
      .status(201)
      .json({ message: "Membership request submitted", requestId });
  } catch (err) {
    console.error("Error requesting membership:", err);
    res.status(500).json({ error: "Failed to request membership" });
  }
});

export default router;
