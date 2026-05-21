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
    // In many environments, the table is user_profiles, let's be resilient
    const profile = await pool.query('SELECT * FROM user_profiles WHERE user_id = $1', [userId]);
    const missions = await pool.query('SELECT id, name as title, status FROM projects WHERE creator_id = $1', [userId]);
    const skills = await pool.query('SELECT skill_name FROM user_skills WHERE user_id = $1', [userId]);

    return {
      role: profile.rows[0]?.primary_role || 'Explorer',
      onboarding_stage: profile.rows[0]?.onboarding_stage || 1,
      activeMissions: missions.rows.filter(m => m.status === 'active'),
      skills: skills.rows.map(s => s.skill_name),
      trustLevel: profile.rows[0]?.trust_level || 1
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
    return {
      collaboratorCount: 0,
      mentorshipStatus: 'active'
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
