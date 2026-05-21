import pool from '../../db.js';
import { findMatchesForNeed } from '../matchingService.js';
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
    const userSkills = context.personal.skills;
    if (!userSkills.length) return [];

    const matches = await pool.query(
      `SELECT id, title, description, 'skill_match' as match_type
       FROM needs
       WHERE status = 'open'
       AND (skills_required && $1 OR $2 @> skills_required)
       LIMIT 3`,
      [userSkills, userSkills]
    );

    return matches.rows.map(m => ({
      ...m,
      priority: 'medium',
      type: 'opportunity',
      requiredSkills: m.skills_required || [],
      message: `Your skill in ${userSkills[0]} is needed for: ${m.title}`
    }));
  }

  async matchResources(userId, context) {
    const resources = await pool.query('SELECT id, name FROM resources WHERE owner_id = $1', [userId]);
    if (!resources.rowCount) return [];

    const matches = [];
    for (const resource of resources.rows) {
      const matchResults = await findMatchesForNeed(resource.id); // Reusing logic if applicable or need to find needs for resource
      if (matchResults.needs?.length) {
        matches.push(...matchResults.needs.map(n => ({
          id: n.id,
          title: n.title,
          type: 'opportunity',
          match_type: 'resource_match',
          message: `Your resource '${resource.name}' matches a need: ${n.title}`
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
