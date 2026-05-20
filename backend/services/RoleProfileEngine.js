import pool from '../db.js';

class RoleProfileEngine {
  /**
   * Calculates the enriched role profile for a user.
   * @param {number} userId
   * @returns {Promise<object>}
   */
  async calculateRoleProfile(userId) {
    const client = await pool.connect();
    try {
      // Fetch user basic info and activity stats
      const [userRes, tasksRes, projectsRes, communitiesRes, governanceRes] = await Promise.all([
        client.query('SELECT * FROM users WHERE id = $1', [userId]),
        client.query(
          `SELECT COUNT(*) as count FROM tasks WHERE $1 = ANY(assigned_user_ids) AND status = 'completed'`,
          [userId]
        ),
        client.query('SELECT COUNT(*) as count FROM projects WHERE creator_id = $1', [userId]),
        client.query('SELECT COUNT(*) as count FROM communities WHERE id IN (SELECT id FROM communities WHERE $1 = ANY(members))', [userId]),
        client.query('SELECT COUNT(*) as count FROM proposals WHERE created_by = $1', [userId])
      ]);

      if (userRes.rows.length === 0) return null;
      const user = userRes.rows[0];

      const completedTasks = parseInt(tasksRes.rows[0].count);
      const createdProjects = parseInt(projectsRes.rows[0].count);
      const joinedCommunities = parseInt(communitiesRes.rows[0].count);
      const governanceActions = parseInt(governanceRes.rows[0].count);

      // Archetype inference logic
      const archetypes = [];
      if (joinedCommunities > 0) archetypes.push('Explorer');
      if (completedTasks > 0) archetypes.push('Contributor');
      if (createdProjects > 0) archetypes.push('Builder');
      if (governanceActions > 0) archetypes.push('Governance Participant');

      // Simple weight calculation
      const roleWeights = {
        explorer: Math.min(joinedCommunities * 0.2, 1.0),
        contributor: Math.min(completedTasks * 0.1, 1.0),
        builder: Math.min(createdProjects * 0.25, 1.0),
        governance: Math.min(governanceActions * 0.2, 1.0)
      };

      // Determine onboarding stage
      let onboardingStage = 'orientation';
      if (completedTasks > 0 || createdProjects > 0) onboardingStage = 'participation';
      if (completedTasks > 10 || createdProjects > 2) onboardingStage = 'stewardship';

      const profile = {
        primaryRole: archetypes[0] || 'Explorer',
        secondaryRoles: archetypes.slice(1),
        trustLevel: user.trust_level || 1,
        onboardingStage: user.onboarding_stage || onboardingStage,
        roleWeights: user.role_weights && Object.keys(user.role_weights).length > 0 ? user.role_weights : roleWeights,
        governanceAccess: governanceActions > 0 || (user.experience?.total_xp > 500),
        mentorshipStatus: user.mentorship_status || { is_mentor: false, mentees: [] },
        adaptivePreferences: user.adaptive_preferences || { density: 'standard', theme_accent: 'default' }
      };

      return profile;
    } finally {
      client.release();
    }
  }
}

export default new RoleProfileEngine();
