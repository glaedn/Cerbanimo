import express from 'express';
import pg from 'pg';

const { Pool } = pg;
const router = express.Router();
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
});

// Create a new community
router.post('/', async (req, res) => {
    const { name, id, description, tags = [] } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const query = `
            INSERT INTO communities (name, description, members, interest_tags)
            VALUES ($1, $2, $3, $4) RETURNING id
        `;
        const values = [name, description, [id], tags || []];
        const result = await client.query(query, values);
        const communityId = result.rows[0].id;
        await client.query('COMMIT');
        res.status(201).json({ message: 'Community created', communityId });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error creating community:', err);
        res.status(500).json({ error: 'Failed to create community' });
    } finally {
        client.release();
    }
});

// Get a community by ID
router.get('/:communityId', async (req, res) => {
    const { communityId } = req.params;
    const client = await pool.connect();
    try {
        const query = `
            SELECT id, name, description, members, interest_tags, proposals, approved_projects
            FROM communities WHERE id = $1
        `;
        const result = await client.query(query, [communityId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Community not found' });
        }
        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error('Error fetching community:', err);
        res.status(500).json({ error: 'Failed to fetch community' });
    } finally {
        client.release();
    }
});

// Get the list of membership requests for a community
router.get('/:communityId/membership-requests', async (req, res) => {
    const { communityId } = req.params;
    const client = await pool.connect();
    try {
        const query = `
            SELECT user_id, votes FROM membership_requests WHERE community_id = $1
        `;
        const result = await client.query(query, [communityId]);
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Error fetching membership requests:', err);
        res.status(500).json({ error: 'Failed to fetch membership requests' });
    } finally {
        client.release();
    }
});

// Submit project to a community's proposals
router.post('/:communityId/submit/:projectId', async (req, res) => {
  const { communityId, projectId } = req.params;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Set community_id on project
    await client.query(
      `UPDATE projects SET community_id = $1 WHERE id = $2`,
      [communityId, projectId]
    );

    // Add to proposals array if not already there
    await client.query(
      `UPDATE communities SET proposals = array_append(proposals, $1)
       WHERE id = $2 AND NOT proposals @> ARRAY[$1]::integer[]`,
      [projectId, communityId]
    );

    await client.query('COMMIT');
    res.status(200).json({ message: 'Project submitted to community.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Submit error:', err);
    res.status(500).json({ error: 'Failed to submit project' });
  } finally {
    client.release();
  }
});

// Vote on adding a new member (vote = true/false)
router.post('/:communityId/vote/member/:userId', async (req, res) => {
    const { communityId, userId } = req.params;
    const { vote } = req.body;
    
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
    
        // Fetch members
        const { rows } = await client.query(
        `SELECT members FROM communities WHERE id = $1`,
        [communityId]
        );
        const community = rows[0];
        const members = community.members || [];
    
        if (!members.includes(userId)) {
        return res.status(403).json({ error: 'User is not a member of this community' });
        }
    
        // Record vote
        await client.query(
        `UPDATE membership_requests SET votes = jsonb_set(
            COALESCE(votes, '{}'),
            $1::text[],
            to_jsonb($2::boolean),
            true
        ) WHERE community_id = $3`,
        [[userId.toString()], vote, communityId]
        );
    
        // Tally votes
        const voteRes = await client.query(
        `SELECT votes FROM membership_requests WHERE community_id = $1 and user_id = $2`,
        [communityId, userId]
        );
        const votes = voteRes.rows[0]?.member_votes || {};
        const voteValues = Object.values(votes);
        const yesVotes = voteValues.filter(v => v === true).length;
        const voteRatio = voteValues.length > 0 ? yesVotes / voteValues.length : 0;
    
        const majorityReached = voteRatio > 0.5 && voteValues.length >= Math.ceil(members.length * 0.5);
    
        // Approve if passed
        if (majorityReached) {
        // Add user to members list
        await client.query(
            `UPDATE communities SET members = array_append(members, $1) WHERE id = $2`,
            [userId, communityId]
        );
        }
    
        await client.query('COMMIT');
        res.status(200).json({
        message: 'Vote recorded.',
        approved: majorityReached,
        currentVotes: votes,
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Vote error:', err);
        res.status(500).json({ error: 'Failed to cast vote' });
    } finally {
        client.release();
    }
    }
);

// Vote on a proposal (vote = true/false)
router.post('/:communityId/vote/:projectId', async (req, res) => {
  const { communityId, projectId } = req.params;
  const { userId, vote } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Fetch members
    const { rows } = await client.query(
      `SELECT members, proposals, approved_projects FROM communities WHERE id = $1`,
      [communityId]
    );
    const community = rows[0];
    const members = community.members || [];

    if (!members.includes(userId)) {
      return res.status(403).json({ error: 'User is not a member of this community' });
    }

    // Record vote
    await client.query(
      `UPDATE projects SET community_votes = jsonb_set(
        COALESCE(community_votes, '{}'),
        $1::text[],
        to_jsonb($2::boolean),
        true
      ) WHERE id = $3`,
      [[userId.toString()], vote, projectId]
    );

    // Tally votes
    const voteRes = await client.query(
      `SELECT community_votes FROM projects WHERE id = $1`,
      [projectId]
    );
    const votes = voteRes.rows[0]?.community_votes || {};
    const voteValues = Object.values(votes);
    const yesVotes = voteValues.filter(v => v === true).length;
    const voteRatio = voteValues.length > 0 ? yesVotes / voteValues.length : 0;

    const majorityReached = voteRatio > 0.5 && voteValues.length >= Math.ceil(members.length * 0.5);

    // Approve if passed
    if (majorityReached) {
      // Remove from proposals and add to approved_projects
      await client.query(
        `UPDATE communities
         SET proposals = array_remove(proposals, $1),
             approved_projects = array_append(approved_projects, $1)
         WHERE id = $2`,
        [projectId, communityId]
      );
    }

    await client.query('COMMIT');
    res.status(200).json({
      message: 'Vote recorded.',
      approved: majorityReached,
      currentVotes: votes,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Vote error:', err);
    res.status(500).json({ error: 'Failed to cast vote' });
  } finally {
    client.release();
  }
});

// Set a user's vote_delegations jsonb field
router.post('/:communityId/delegate/:userId', async (req, res) => {
  const { communityId, userId } = req.params;
  const { delegateTo } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Fetch members
    const { rows } = await client.query(
      `SELECT members FROM communities WHERE id = $1`,
      [communityId]
    );
    const community = rows[0];
    const members = community.members || [];

    if (!members.includes(userId)) {
      return res.status(403).json({ error: 'User is not a member of this community' });
    }

    // Set delegation
    await client.query(
      `UPDATE users SET vote_delegations = jsonb_set(
        COALESCE(vote_delegations, '{}'),
        $1::text[],
        to_jsonb($2::text),
        true
      ) WHERE id = $3`,
      [[userId.toString()], delegateTo, userId]
    );

    await client.query('COMMIT');
    res.status(200).json({ message: 'Vote delegation set.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Delegation error:', err);
    res.status(500).json({ error: 'Failed to set vote delegation' });
  } finally {
    client.release();
  }
});

// revoke a user's vote_delegations jsonb field
router.post('/:communityId/revoke/:userId', async (req, res) => {
  const { communityId, userId } = req.params;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Fetch members
    const { rows } = await client.query(
      `SELECT members FROM communities WHERE id = $1`,
      [communityId]
    );
    const community = rows[0];
    const members = community.members || [];

    if (!members.includes(userId)) {
      return res.status(403).json({ error: 'User is not a member of this community' });
    }

    // Revoke delegation
    await client.query(
      `UPDATE users SET vote_delegations = jsonb_set(
        COALESCE(vote_delegations, '{}'),
        $1::text[],
        to_jsonb(NULL),
        true
      ) WHERE id = $2`,
      [[userId.toString()], userId]
    );

    await client.query('COMMIT');
    res.status(200).json({ message: 'Vote delegation revoked.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Revoke error:', err);
    res.status(500).json({ error: 'Failed to revoke vote delegation' });
  } finally {
    client.release();
  }
});


export default router;
