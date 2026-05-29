import pool from '../../db.js';

class ContextEngine {
  async getContext(userId) {
    const [personal, temporal, social, system] = await Promise.all([
      this.getPersonalContext(userId),
      this.getTemporalContext(userId),
      this.getSocialContext(userId),
      this.getSystemContext(userId)
    ]);

    const baseContext = {
      personal,
      temporal,
      social,
      system,
      timestamp: new Date().toISOString()
    };

    return {
      ...baseContext,
      emotionalStateEstimate: this.estimateEmotionalState(baseContext),
      currentFocus: this.determineFocus(baseContext),
      urgencyLevel: this.determineUrgency(baseContext)
    };
  }

  async getPersonalContext(userId) {
    // The table is 'users', and skills are stored as JSONB in the 'skills' column
    const userRes = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    const missions = await pool.query('SELECT id, name as title, status FROM projects WHERE creator_id = $1', [userId]);

    const user = userRes.rows[0] || {};

    // Extract skills from JSONB. Expected format: [{id, name, level}, ...] or ['Skill1', 'Skill2']
    let skillNames = [];
    let skillIds = [];

    const processSkillsArray = (arr) => {
      arr.forEach(s => {
        if (typeof s === 'string') {
          skillNames.push(s);
        } else if (typeof s === 'object' && s !== null) {
          if (s.name) skillNames.push(s.name);
          if (s.id) skillIds.push(parseInt(s.id));
        }
      });
    };

    if (Array.isArray(user.skills)) {
      processSkillsArray(user.skills);
    } else if (typeof user.skills === 'string' && user.skills.trim() !== '') {
      try {
        const parsed = JSON.parse(user.skills);
        if (Array.isArray(parsed)) {
          processSkillsArray(parsed);
        }
      } catch (e) {
        console.error('Failed to parse user skills:', e);
      }
    }

    return {
      role: user.roles?.[0] || 'Explorer', // fallback to first role or Explorer
      onboarding_stage: user.onboarding_stage || 1,
      activeMissions: missions.rows.filter(m => m.status === 'active'),
      skills: skillNames,
      skillIds: skillIds,
      trustLevel: user.trust_level || 1
    };
  }

  async getTemporalContext(userId) {
    // assigned_to -> assigned_user_ids (array)
    const recentActivity = await pool.query(
      'SELECT id FROM tasks WHERE ($1 = ANY(assigned_user_ids) OR creator_id = $1) AND updated_at > NOW() - INTERVAL \'7 days\'',
      [userId]
    );

    const deadlines = await pool.query(
      'SELECT id FROM tasks WHERE ($1 = ANY(assigned_user_ids) OR creator_id = $1) AND due_date > NOW() AND due_date < NOW() + INTERVAL \'3 days\'',
      [userId]
    );

    return {
      recentActivityCount: recentActivity.rowCount,
      upcomingDeadlines: deadlines.rows,
      hasInactivityRisk: recentActivity.rowCount === 0
    };
  }

  async getSocialContext(userId) {
    // assigned_to -> assigned_user_ids (array)
    // Collaborators are users assigned to the same projects as the current user, excluding the user themselves
    const collaborators = await pool.query(
      `SELECT DISTINCT unnest(assigned_user_ids) as collaborator_id
       FROM tasks
       WHERE project_id IN (SELECT project_id FROM tasks WHERE $1 = ANY(assigned_user_ids))
       AND NOT ($1 = ANY(assigned_user_ids) AND array_length(assigned_user_ids, 1) = 1)`,
      [userId]
    );

    // community_members table replaced by members array in communities table
    const constellations = await pool.query(
      'SELECT id as community_id FROM communities WHERE $1 = ANY(members)',
      [userId]
    );

    return {
      collaboratorCount: collaborators.rowCount > 0 ? collaborators.rows.filter(r => r.collaborator_id !== parseInt(userId)).length : 0,
      activeConstellations: constellations.rows,
      mentorshipStatus: collaborators.rowCount > 5 ? 'mentor' : 'active'
    };
  }

  async getSystemContext(userId) {
    const blockedMissions = await pool.query(
      'SELECT id FROM projects WHERE status = \'blocked\' AND creator_id = $1',
      [userId]
    );

    return {
      blockedMissions: blockedMissions.rows,
      urgencyLevel: blockedMissions.rowCount > 0 ? 'medium' : 'normal'
    };
  }

  estimateEmotionalState(context) {
    const missionCount = context.personal.activeMissions.length;
    const deadlineCount = context.temporal.upcomingDeadlines.length;

    if (missionCount > 5 || deadlineCount > 3) {
      return 'overloaded';
    }
    return 'calm';
  }

  determineFocus(context) {
    if (context.system.blockedMissions.length > 0) return 'unblocking_missions';
    if (context.temporal.upcomingDeadlines.length > 0) return 'meeting_deadlines';
    return 'exploration';
  }

  determineUrgency(context) {
    if (context.temporal.upcomingDeadlines.length > 0) return 'medium';
    return 'low';
  }
}

export default new ContextEngine();
