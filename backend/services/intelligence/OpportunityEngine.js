import pool from '../../db.js';
import { findMatchesForResource } from '../matchingService.js';
import BountyService from '../BountyService.js';

class OpportunityEngine {
  async getOpportunities(userId, context) {
    const [skillMatches, resourceMatches, socialMatches] = await Promise.all([
      this.matchSkills(userId, context),
      this.matchResources(userId, context),
      this.matchSocial(userId, context)
    ]);

    return [...skillMatches, ...resourceMatches, ...socialMatches];
  }

  async matchSkills(userId, context) {
    const userSkillIds = context.personal.skillIds || [];
    if (!userSkillIds.length) return [];

    // needs table: title -> name, skills_required -> skill_ids
    // matching against skill_ids (INTEGER[]) using integer array $1
    const matches = await pool.query(
      `SELECT id, name, description, skill_ids, 'skill_match' as match_type
       FROM needs
       WHERE status = 'open'
       AND (skill_ids && $1 OR $2 @> skill_ids)
       LIMIT 3`,
      [userSkillIds, userSkillIds]
    );

    return matches.rows.map(m => ({
      ...m,
      priority: 'medium',
      type: 'opportunity',
      requiredSkills: m.skill_ids || [],
      message: `Your skill matching one of the requirements is needed for: ${m.name}`
    }));
  }

  async matchResources(userId, context) {
    // resources table: owner_id -> owner_user_id
    const resources = await pool.query('SELECT id, name FROM resources WHERE owner_user_id = $1', [userId]);
    if (!resources.rowCount) return [];

    const matches = [];
    for (const resource of resources.rows) {
      // Corrected call: findMatchesForResource finds needs that match a resource
      const matchResults = await findMatchesForResource(resource.id, pool);
      if (matchResults?.length) {
        matches.push(...matchResults.map(n => ({
          id: n.id,
          title: n.name, // needs table: name
          type: 'opportunity',
          match_type: 'resource_match',
          message: `Your resource '${resource.name}' matches a need: ${n.name}`
        })));
      }
    }
    return matches.slice(0, 3);
  }

  async matchSocial(userId, context) {
    const bounties = await pool.query('SELECT * FROM bounties WHERE status = \'open\' LIMIT 3');
    return bounties.rows.map(b => ({
      id: b.id,
      title: b.title,
      type: 'opportunity',
      match_type: 'bounty',
      message: `Active Bounty: ${b.title} (${b.reward_amount} credits)`
    }));
  }
}

export default new OpportunityEngine();
