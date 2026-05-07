import pool from '../db.js';

class CoordinationAgentService {
  async getNeedAgentSignals() {
    const result = await pool.query(`
      SELECT
        n.id,
        n.name,
        n.category,
        n.status,
        COALESCE(n.urgency_level, n.urgency, 'medium') AS urgency,
        n.complexity_score,
        n.required_before_date,
        n.created_at,
        COUNT(t.id)::int AS task_count,
        COUNT(t.id) FILTER (WHERE t.status::text LIKE '%unassigned%')::int AS unassigned_tasks
      FROM needs n
      LEFT JOIN tasks t ON t.related_need_id = n.id
      WHERE n.status IN ('open', 'in_progress')
      GROUP BY n.id
      ORDER BY
        CASE LOWER(COALESCE(n.urgency_level, n.urgency, 'medium'))
          WHEN 'critical' THEN 4
          WHEN 'high' THEN 3
          WHEN 'medium' THEN 2
          WHEN 'low' THEN 1
          ELSE 0
        END DESC,
        n.complexity_score DESC NULLS LAST,
        n.created_at ASC
      LIMIT 12
    `);

    return result.rows.map((need) => {
      const ageHours = (Date.now() - new Date(need.created_at).getTime()) / (1000 * 60 * 60);
      const dueHours = need.required_before_date
        ? (new Date(need.required_before_date).getTime() - Date.now()) / (1000 * 60 * 60)
        : null;

      let severity = 30;
      if (need.urgency === 'high') severity += 25;
      if (need.urgency === 'critical') severity += 45;
      if (Number(need.complexity_score) >= 2.5) severity += 12;
      if (need.unassigned_tasks > 0) severity += 10;
      if (dueHours !== null && dueHours <= 24) severity += 20;
      if (ageHours >= 72) severity += 10;

      const recommendation = need.task_count === 0
        ? 'Expand this need into a mission or create a direct fulfillment task.'
        : need.unassigned_tasks > 0
          ? 'Recruit contributors for unassigned work and broadcast to matching guilds.'
          : 'Monitor fulfillment progress and prepare verification.';

      return {
        agent: 'Need Agent',
        subjectType: 'need',
        subjectId: need.id,
        title: need.name,
        severity: Math.min(Math.round(severity), 100),
        status: need.status,
        signal: `${need.urgency} urgency / ${need.task_count} tasks / ${need.unassigned_tasks} unassigned`,
        recommendation
      };
    });
  }

  async getMissionAgentSignals() {
    const result = await pool.query(`
      SELECT
        p.id,
        p.name,
        p.status,
        p.due_date,
        COUNT(t.id)::int AS task_count,
        COUNT(t.id) FILTER (WHERE t.status = 'completed')::int AS completed_tasks,
        COUNT(t.id) FILTER (WHERE t.status::text LIKE '%unassigned%')::int AS unassigned_tasks,
        COUNT(t.id) FILTER (WHERE t.due_date IS NOT NULL AND t.due_date < NOW() AND t.status NOT IN ('completed', 'submitted'))::int AS overdue_tasks,
        AVG(COALESCE(t.priority_score, 0))::float AS average_priority
      FROM projects p
      JOIN tasks t ON t.project_id = p.id
      WHERE COALESCE(p.status, 'active') NOT IN ('completed', 'archived', 'cancelled')
      GROUP BY p.id
      ORDER BY overdue_tasks DESC, unassigned_tasks DESC, average_priority DESC NULLS LAST
      LIMIT 12
    `);

    return result.rows.map((project) => {
      const completion = project.task_count > 0 ? project.completed_tasks / project.task_count : 0;
      let severity = 20 + project.overdue_tasks * 20 + project.unassigned_tasks * 8;
      if (completion < 0.25 && project.task_count >= 4) severity += 10;

      const recommendation = project.overdue_tasks > 0
        ? 'Re-plan overdue work, escalate blockers, and notify assigned contributors.'
        : project.unassigned_tasks > 0
          ? 'Route open tasks to matching contributors before momentum stalls.'
          : 'Keep monitoring delivery rhythm and verify completed outcomes.';

      return {
        agent: 'Mission Agent',
        subjectType: 'project',
        subjectId: project.id,
        title: project.name,
        severity: Math.min(Math.round(severity), 100),
        status: project.status || 'active',
        signal: `${project.completed_tasks}/${project.task_count} complete / ${project.overdue_tasks} overdue`,
        recommendation
      };
    });
  }

  async getCommunityAgentSignals() {
    const result = await pool.query(`
      SELECT
        c.id,
        c.name,
        COUNT(DISTINCT n.id)::int AS open_needs,
        COUNT(DISTINCT p.id)::int AS active_projects,
        COUNT(t.id) FILTER (WHERE t.status::text LIKE '%unassigned%')::int AS unassigned_tasks
      FROM communities c
      LEFT JOIN needs n ON n.requestor_community_id = c.id AND n.status IN ('open', 'in_progress')
      LEFT JOIN projects p ON p.community_id = c.id AND COALESCE(p.status, 'active') NOT IN ('completed', 'archived', 'cancelled')
      LEFT JOIN tasks t ON t.project_id = p.id
      GROUP BY c.id
      HAVING COUNT(DISTINCT n.id) > 0 OR COUNT(DISTINCT p.id) > 0
      ORDER BY open_needs DESC, unassigned_tasks DESC
      LIMIT 10
    `);

    return result.rows.map((community) => {
      const severity = Math.min(100, community.open_needs * 15 + community.unassigned_tasks * 5);
      const recommendation = community.open_needs >= 3
        ? 'Create a coordination pulse: group related needs, appoint leads, and publish a shared priority list.'
        : community.unassigned_tasks > 0
          ? 'Invite contributors from adjacent guilds and surface low-friction entry tasks.'
          : 'Maintain visibility and collect outcome stories for the Chronicle.';

      return {
        agent: 'Community Agent',
        subjectType: 'community',
        subjectId: community.id,
        title: community.name,
        severity,
        status: 'active',
        signal: `${community.open_needs} open needs / ${community.active_projects} active missions`,
        recommendation
      };
    });
  }

  async getSignals() {
    const [needs, missions, communities] = await Promise.all([
      this.getNeedAgentSignals(),
      this.getMissionAgentSignals(),
      this.getCommunityAgentSignals()
    ]);

    return [...needs, ...missions, ...communities]
      .sort((a, b) => b.severity - a.severity)
      .slice(0, 25);
  }
}

export default new CoordinationAgentService();
