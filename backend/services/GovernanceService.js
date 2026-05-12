import pool from '../db.js';
import { calculateVoteWeight } from '../utils/voteWeight.js';

class GovernanceService {
  async createProposal(communityId, type, title, description, payload, actorId) {
    const query = `
      INSERT INTO proposals (community_id, proposal_type, title, description, payload, created_by, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'deliberation')
      RETURNING *
    `;
    const result = await pool.query(query, [communityId, type, title, description, payload, actorId]);

    await this.recordGovernanceEvent(communityId, 'proposal.created', { proposalId: result.rows[0].id, actorId });

    return result.rows[0];
  }

  async castVote(proposalId, userId, voteValue, isDelegated = false) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get proposal and community info
      const propRes = await client.query('SELECT community_id, status FROM proposals WHERE id = $1', [proposalId]);
      if (propRes.rows.length === 0) throw new Error('Proposal not found');
      const proposal = propRes.rows[0];

      if (proposal.status !== 'deliberation' && proposal.status !== 'voting') {
        throw new Error('Proposal is not in a votable state');
      }

      // Calculate weight with domain context
      const { weight } = await calculateVoteWeight(client, proposal.community_id, userId, { domain: proposal.proposal_type });

      const query = `
        INSERT INTO votes (proposal_id, user_id, vote, weight, is_delegated)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (proposal_id, user_id)
        DO UPDATE SET vote = EXCLUDED.vote, weight = EXCLUDED.weight, is_delegated = EXCLUDED.is_delegated, created_at = NOW()
        RETURNING *
      `;
      const result = await client.query(query, [proposalId, userId, voteValue, weight, isDelegated]);

      await client.query('COMMIT');
      return result.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async tallyVotes(proposalId) {
    const client = await pool.connect();
    try {
      const propRes = await client.query(`
        SELECT p.*, c.governance_config
        FROM proposals p
        JOIN communities c ON p.community_id = c.id
        WHERE p.id = $1
      `, [proposalId]);

      if (propRes.rows.length === 0) throw new Error('Proposal not found');
      const proposal = propRes.rows[0];
      const config = proposal.governance_config;

      const votesRes = await client.query('SELECT vote, weight FROM votes WHERE proposal_id = $1', [proposalId]);
      const votes = votesRes.rows;

      const { totalPossibleWeight } = await calculateVoteWeight(client, proposal.community_id, null, { domain: proposal.proposal_type });

      let yesWeight = 0;
      let totalVotedWeight = 0;

      for (const v of votes) {
        totalVotedWeight += parseFloat(v.weight);
        if (v.vote === true || (typeof v.vote === 'object' && v.vote.value === true)) {
          yesWeight += parseFloat(v.weight);
        }
      }

      const turnout = totalVotedWeight / totalPossibleWeight;
      const ratio = yesWeight / totalVotedWeight;

      const passed = turnout >= (config.quorum || 0.1) && ratio > 0.5;

      return {
        passed,
        turnout,
        ratio,
        totalVotedWeight,
        totalPossibleWeight
      };
    } finally {
      client.release();
    }
  }

  async executeProposal(proposalId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const propRes = await client.query('SELECT * FROM proposals WHERE id = $1 FOR UPDATE', [proposalId]);
      if (propRes.rows.length === 0) throw new Error('Proposal not found');
      const proposal = propRes.rows[0];

      if (proposal.status !== 'deliberation' && proposal.status !== 'voting') {
         throw new Error('Proposal is not in a state that can be executed');
      }

      const tally = await this.tallyVotes(proposalId);
      if (!tally.passed) {
        await client.query("UPDATE proposals SET status = 'rejected' WHERE id = $1", [proposalId]);
        await client.query('COMMIT');
        return { executed: false, reason: 'Proposal did not pass quorum or majority' };
      }

      // Handle different proposal types
      if (proposal.proposal_type === 'constitution') {
        const { content } = proposal.payload;
        const versionRes = await client.query('SELECT COALESCE(MAX(version), 0) + 1 as next_version FROM constitutions WHERE community_id = $1', [proposal.community_id]);
        const nextVersion = versionRes.rows[0].next_version;

        // Deactivate old constitution
        await client.query('UPDATE constitutions SET active = FALSE WHERE community_id = $1', [proposal.community_id]);

        // Create new one
        const constRes = await client.query(
          'INSERT INTO constitutions (community_id, version, content, active) VALUES ($1, $2, $3, TRUE) RETURNING id',
          [proposal.community_id, nextVersion, content]
        );

        await client.query('UPDATE communities SET active_constitution_id = $1 WHERE id = $2', [constRes.rows[0].id, proposal.community_id]);
      } else if (proposal.proposal_type === 'governance') {
         // Update community governance_config
         await client.query(
           'UPDATE communities SET governance_config = governance_config || $1 WHERE id = $2',
           [proposal.payload, proposal.community_id]
         );
      } else if (proposal.proposal_type === 'community.location_change') {
        const { latitude, longitude, city, state, country, formatted_address } = proposal.payload;

        // Get old location for audit trail
        const oldLocRes = await client.query('SELECT city, state, country, formatted_address, ST_AsGeoJSON(location_point) as location FROM communities WHERE id = $1', [proposal.community_id]);
        const oldData = oldLocRes.rows[0];

        await client.query(`
          UPDATE communities
          SET
            location_point = CASE
              WHEN $1::numeric IS NOT NULL AND $2::numeric IS NOT NULL
              THEN ST_SetSRID(ST_MakePoint($2::numeric, $1::numeric), 4326)::geography
              ELSE location_point
            END,
            city = COALESCE($3, city),
            state = COALESCE($4, state),
            country = COALESCE($5, country),
            formatted_address = COALESCE($6, formatted_address)
          WHERE id = $7
        `, [latitude, longitude, city, state, country, formatted_address, proposal.community_id]);

        await this.recordGovernanceEvent(proposal.community_id, 'community.location_updated', {
          proposalId,
          oldData: {
            ...oldData,
            location: oldData.location ? JSON.parse(oldData.location) : null
          },
          newData: {
            latitude, longitude, city, state, country, formatted_address
          }
        });
      }

      await client.query("UPDATE proposals SET status = 'executed' WHERE id = $1", [proposalId]);

      await this.recordGovernanceEvent(proposal.community_id, 'proposal.executed', { proposalId });

      await client.query('COMMIT');
      return { executed: true };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async recordGovernanceEvent(communityId, eventType, payload) {
    await pool.query(
      'INSERT INTO governance_events (community_id, event_type, payload) VALUES ($1, $2, $3)',
      [communityId, eventType, payload]
    );
  }
}

export default new GovernanceService();
