// backend/services/ProjectHealthService.js

/**
 * ProjectHealthService calculates health scores based on activity, velocity, and impact.
 * Score derived from: activity frequency, task completion velocity, contributor retention, verification pass rate, impact graph connectivity.
 */
class ProjectHealthService {
  constructor(dbPool) {
    this.db = dbPool;
  }

  /**
   * Calculates a health score (0-100) for a given project.
   * @param {string} projectId
   * @returns {Promise<number>}
   */
  async calculateHealthScore(projectId) {
    let score = 0;

    // 1. Task Completion Velocity (Past 30 days)
    const { rows: completedTasks } = await this.db.query(
      `SELECT count(*) FROM tasks
       WHERE project_id = $1 AND status = 'completed' AND completed_at > (NOW() - INTERVAL '30 days')`,
      [projectId]
    );
    const velocity = parseInt(completedTasks[0].count);
    score += Math.min(velocity * 5, 25); // Max 25 points for completion velocity

    // 2. Contributor Retention
    const { rows: uniqueContributors } = await this.db.query(
      `SELECT count(DISTINCT completer_id) FROM tasks
       WHERE project_id = $1 AND status = 'completed'`,
      [projectId]
    );
    const retention = parseInt(uniqueContributors[0].count);
    score += Math.min(retention * 5, 20); // Max 20 points for contributor retention

    // 3. Verification Pass Rate (Phase 1)
    const { rows: verifStats } = await this.db.query(
      `SELECT count(*) filter (where status = 'verified') as success,
              count(*) as total
       FROM tasks WHERE project_id = $1 AND status IN ('verified', 'disputed')`,
      [projectId]
    );
    const passRate = verifStats[0].total > 0 ? (verifStats[0].success / verifStats[0].total) : 1;
    score += (passRate * 25); // Max 25 points for verification pass rate

    // 4. Impact Graph Connectivity (Phase 0)
    // Is this project still linked to a live Outcome node?
    const { rows: outcomes } = await this.db.query(
      `SELECT count(*) FROM project_outcomes WHERE project_id = $1`,
      [projectId]
    );
    const connectivity = parseInt(outcomes[0].count);
    score += connectivity > 0 ? 30 : 0; // Max 30 points for impact connectivity

    return Math.round(score);
  }

  async updateProjectHealthScores() {
    const { rows: projects } = await this.db.query('SELECT id FROM projects WHERE status != \'closed\'');

    for (const project of projects) {
      const health_score = await this.calculateHealthScore(project.id);
      await this.db.query(
        'UPDATE projects SET health_score = $1 WHERE id = $2',
        [health_score, project.id]
      );
    }
  }

  /**
   * Formally close a project (Phase 7).
   * @param {string} projectId
   * @param {string} reason
   */
  async closeProject(projectId, reason) {
    // 1. Resolve all open tasks (Phase 7)
    await this.db.query(
      'UPDATE tasks SET status = \'cancelled\', closure_reason = \'project_closed\' WHERE project_id = $1 AND status = \'open\'',
      [projectId]
    );

    // 2. Close project and record final reason
    await this.db.query(
      'UPDATE projects SET status = \'closed\', closure_reason = $1, closed_at = NOW() WHERE id = $2',
      [reason, projectId]
    );

    // 3. Close the Outcome nodes with a resolution statement (Phase 7)
    await this.db.query(
      'UPDATE outcomes SET resolution = $1, status = \'closed\' WHERE id IN (SELECT outcome_id FROM project_outcomes WHERE project_id = $2)',
      [`Closed with project reason: ${reason}`, projectId]
    );

    // 4. Generate final story summary (Phase 5)
    // ... logic to call StoryEngineService for a final wrap-up
  }
}

export default ProjectHealthService;
