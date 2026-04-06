import express from 'express';
import ConstellationService from '../services/ConstellationService.js';
import pool from '../db.js';
import { calculateVoteWeight } from '../utils/voteWeight.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT c.*,
        (SELECT count(*) FROM constellation_tasks ct JOIN tasks t ON ct.task_id = t.id WHERE ct.constellation_id = c.id AND t.status = 'completed') as tasks_completed,
        (SELECT count(*) FROM constellation_tasks WHERE constellation_id = c.id) as tasks_total
      FROM constellations c
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/eligible-projects', async (req, res) => {
  const { userId, communityId } = req.query;
  try {
    let projects = [];
    if (communityId) {
      const commRes = await pool.query(
        'SELECT approved_projects, proposals FROM communities WHERE id = $1',
        [communityId]
      );
      if (commRes.rows.length > 0) {
        const { approved_projects = [], proposals = [] } = commRes.rows[0];
        const allIds = [...new Set([...(approved_projects || []), ...(proposals || [])])];
        if (allIds.length > 0) {
          const projRes = await pool.query(
            'SELECT id, name, description, status FROM projects WHERE id = ANY($1)',
            [allIds]
          );
          projects = projRes.rows;
        }
      }
    } else if (userId) {
      const projRes = await pool.query(
        'SELECT id, name, description, status FROM projects WHERE creator_id = $1',
        [userId]
      );
      projects = projRes.rows;
    }
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/form', async (req, res) => {
  const { name, sharedObjective, outcomeId, initialCommunityId, initialProjectId } = req.body;
  try {
    const constellation = await ConstellationService.formConstellation(name, sharedObjective, outcomeId, initialCommunityId, initialProjectId);
    res.status(201).json(constellation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:constellationId/invites', async (req, res) => {
  const { inviterId, inviteeIds } = req.body; // inviteeIds should be an array
  try {
    const invites = [];
    if (Array.isArray(inviteeIds)) {
      for (const inviteeId of inviteeIds) {
        const invite = await ConstellationService.inviteCommunity(req.params.constellationId, inviterId, inviteeId);
        invites.push(invite);
      }
    } else if (req.body.inviteeId) {
        // Fallback for single invitee if still sent that way
        const invite = await ConstellationService.inviteCommunity(req.params.constellationId, inviterId, req.body.inviteeId);
        invites.push(invite);
    }
    res.status(201).json(invites);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/invites/community/:communityId', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ci.*, c.name as constellation_name, com.name as inviter_name
      FROM constellation_invites ci
      JOIN constellations c ON ci.constellation_id = c.id
      JOIN communities com ON ci.inviter_community_id = com.id
      WHERE ci.invitee_community_id = $1 AND ci.status = 'pending'
    `, [req.params.communityId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/invites/:inviteId/vote', async (req, res) => {
  const { userId, vote, communityId } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Cast the vote
    await client.query(`
      UPDATE constellation_invites
      SET votes = jsonb_set(COALESCE(votes, '{}'::jsonb), ARRAY[$1::text], to_jsonb($2::boolean), true)
      WHERE id = $3
    `, [userId, vote, req.params.inviteId]);

    const inviteRes = await client.query('SELECT * FROM constellation_invites WHERE id = $1', [req.params.inviteId]);
    const invite = inviteRes.rows[0];
    const votes = invite.votes || {};

    // Get community weight data
    const { totalPossibleWeight } = await calculateVoteWeight(client, invite.invitee_community_id);

    let yesWeight = 0;
    let totalVotedWeight = 0;

    for (const [voterId, val] of Object.entries(votes)) {
      const { weight } = await calculateVoteWeight(client, invite.invitee_community_id, voterId);
      totalVotedWeight += weight;
      if (val === true) yesWeight += weight;
    }

    // Threshold: Majority (50%) of active weight AND at least 20% turnout of total community weight
    const majorityReached = yesWeight > totalVotedWeight / 2;
    const turnoutReached = totalVotedWeight >= totalPossibleWeight * 0.2;

    if (majorityReached && turnoutReached) {
      await client.query('UPDATE constellation_invites SET status = \'accepted\' WHERE id = $1', [req.params.inviteId]);
      await client.query('INSERT INTO constellation_members (constellation_id, entity_type, entity_id) VALUES ($1, \'community\', $2)', [invite.constellation_id, invite.invitee_community_id]);
    }

    await client.query('COMMIT');
    res.json({
      message: 'Vote recorded',
      yesWeight,
      totalVotedWeight,
      totalPossibleWeight,
      accepted: majorityReached && turnoutReached
    });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.post('/:constellationId/members', async (req, res) => {
  const { entityType, entityId } = req.body;
  try {
    const member = await ConstellationService.addMember(req.params.constellationId, entityType, entityId);
    res.status(201).json(member);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:constellationId/tasks', async (req, res) => {
  const { taskId } = req.body;
  try {
    const task = await ConstellationService.addSharedTask(req.params.constellationId, taskId);
    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:constellationId/projects', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*
      FROM projects p
      JOIN constellation_members cm ON p.id = cm.entity_id
      WHERE cm.constellation_id = $1 AND cm.entity_type = 'project'
    `, [req.params.constellationId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:constellationId/tasks', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.*, p.name as project_name
      FROM tasks t
      JOIN constellation_tasks ct ON t.id = ct.task_id
      JOIN projects p ON t.project_id = p.id
      WHERE ct.constellation_id = $1
    `, [req.params.constellationId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:constellationId/amendments', async (req, res) => {
  const { proposerId, oldObjective, newObjective } = req.body;
  try {
    const amendment = await ConstellationService.amendObjective(req.params.constellationId, proposerId, oldObjective, newObjective);
    res.status(201).json(amendment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:constellationId/amendments', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM objective_amendments WHERE constellation_id = $1 AND status = $2', [req.params.constellationId, 'voting']);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/amendments/:amendmentId/vote', async (req, res) => {
    const { voterId, rankings } = req.body;
    try {
        const vote = await ConstellationService.castRankedChoiceVote(req.params.amendmentId, voterId, rankings);
        res.json(vote);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/:constellationId/contribution-splits', async (req, res) => {
  const { taskId, splits, proposerId } = req.body;
  try {
    const split = await ConstellationService.proposeContributionSplit(taskId, req.params.constellationId, splits, proposerId);
    res.status(201).json(split);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:constellationId/contribution-splits', async (req, res) => {
  try {
    const result = await pool.query('SELECT cs.*, t.name as task_name FROM contribution_splits cs JOIN tasks t ON cs.task_id = t.id WHERE cs.constellation_id = $1', [req.params.constellationId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
