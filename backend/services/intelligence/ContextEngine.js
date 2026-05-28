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

    // Extract skills from JSONB. Expected format: [{name: 'Skill', level: 1}, ...] or ['Skill1', 'Skill2']
    let skillNames = [];
    if (Array.isArray(user.skills)) {
      skillNames = user.skills.map(s => typeof s === 'string' ? s : s.name);
    } else if (typeof user.skills === 'string' && user.skills.trim() !== '') {
      try {
        const parsed = JSON.parse(user.skills);
        if (Array.isArray(parsed)) {
          skillNames = parsed.map(s => typeof s === 'string' ? s : s.name);
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
      trustLevel: user.trust_level || 1
    };
  }

  async getTemporalContext(userId) {
    const recentActivity = await pool.query(
      'SELECT id FROM tasks WHERE (assigned_to = $1 OR creator_id = $1) AND updated_at > NOW() - INTERVAL \'7 days\'',
      [userId]
    );

    const deadlines = await pool.query(
      'SELECT id FROM tasks WHERE (assigned_to = $1 OR creator_id = $1) AND deadline > NOW() AND deadline < NOW() + INTERVAL \'3 days\'',
      [userId]
    );

    return {
      recentActivityCount: recentActivity.rowCount,
      upcomingDeadlines: deadlines.rows,
      hasInactivityRisk: recentActivity.rowCount === 0
    };
  }

  async getSocialContext(userId) {
    const collaborators = await pool.query(
      'SELECT DISTINCT assigned_to FROM tasks WHERE project_id IN (SELECT project_id FROM tasks WHERE assigned_to = $1) AND assigned_to != $1',
      [userId]
    );

    const constellations = await pool.query(
      'SELECT community_id FROM community_members WHERE user_id = $1',
      [userId]
    );

    return {
      collaboratorCount: collaborators.rowCount,
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
