import pool from '../db.js';

class ConstellationService {
  async formConstellation(name, sharedObjective, outcomeId = null, initialCommunityId = null, initialProjectId = null) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const query = `
        INSERT INTO constellations (name, shared_objective, outcome_id, status)
        VALUES ($1, $2, $3, 'forming')
        RETURNING *;
      `;
      const result = await client.query(query, [name, sharedObjective, outcomeId]);
      const constellation = result.rows[0];

      if (initialCommunityId) {
        await client.query(
          'INSERT INTO constellation_members (constellation_id, entity_type, entity_id) VALUES ($1, $2, $3)',
          [constellation.id, 'community', initialCommunityId]
        );
      }

      if (initialProjectId) {
        await client.query(
          'INSERT INTO constellation_members (constellation_id, entity_type, entity_id) VALUES ($1, $2, $3)',
          [constellation.id, 'project', initialProjectId]
        );
      }

      await client.query('COMMIT');
      return constellation;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async inviteCommunity(constellationId, inviterId, inviteeId) {
    const query = `
      INSERT INTO constellation_invites (constellation_id, inviter_community_id, invitee_community_id, status)
      VALUES ($1, $2, $3, 'pending')
      RETURNING *;
    `;
    const result = await pool.query(query, [constellationId, inviterId, inviteeId]);
    return result.rows[0];
  }

  async addMember(constellationId, entityType, entityId) {
    const query = `
      INSERT INTO constellation_members (constellation_id, entity_type, entity_id)
      VALUES ($1, $2, $3)
      RETURNING *;
    `;
    const result = await pool.query(query, [constellationId, entityType, entityId]);
    return result.rows[0];
  }

  async addSharedTask(constellationId, taskId) {
    const query = `
      INSERT INTO constellation_tasks (constellation_id, task_id)
      VALUES ($1, $2)
      RETURNING *;
    `;
    const result = await pool.query(query, [constellationId, taskId]);
    return result.rows[0];
  }

  async proposeContributionSplit(taskId, constellationId, splits, proposerId) {
    const query = `
      INSERT INTO contribution_splits (task_id, constellation_id, splits, proposer_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const result = await pool.query(query, [taskId, constellationId, JSON.stringify(splits), proposerId]);
    return result.rows[0];
  }

  async amendObjective(constellationId, proposerId, oldObjective, newObjective) {
    const query = `
      INSERT INTO objective_amendments (constellation_id, proposer_id, old_objective, new_objective)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const result = await pool.query(query, [constellationId, proposerId, oldObjective, newObjective]);
    return result.rows[0];
  }

  async castRankedChoiceVote(amendmentId, voterId, rankings) {
    const query = `
      UPDATE objective_amendments
      SET votes_rcv = jsonb_set(COALESCE(votes_rcv, '{}'::jsonb), ARRAY[$1::text], $2::jsonb)
      WHERE id = $3
      RETURNING *;
    `;
    const result = await pool.query(query, [voterId, JSON.stringify(rankings), amendmentId]);
    return result.rows[0];
  }

  // Simplified Ranked Choice Vote (RCV) Logic
  calculateRCVOutcome(votes) {
     const voteCounts = {};
     Object.values(votes).forEach(rankings => {
        const topChoice = rankings[0];
        voteCounts[topChoice] = (voteCounts[topChoice] || 0) + 1;
     });

     const totalVotes = Object.keys(votes).length;
     for (const choice in voteCounts) {
        if (voteCounts[choice] > totalVotes / 2) return choice;
     }

     return Object.keys(voteCounts).sort((a,b) => voteCounts[b] - voteCounts[a])[0];
  }
}

export default new ConstellationService();
