import pool from '../../db.js';

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
    // Placeholder for resource matching logic
    return [];
  }

  async matchSocial(userId, context) {
    // Matches based on previous collaborators
    return [];
  }
}

export default new OpportunityEngine();
