import pool from '../db.js';
import CoordinationAgentService from './CoordinationAgentService.js';

class CivicKernelSummaryService {
  async getOverview() {
    const [
      eventCounts,
      nodeCounts,
      relationshipCounts,
      intentCounts,
      recentEvents,
      activeIntents,
      urgentNeeds,
      missionLinks,
      agentSignals
    ] = await Promise.all([
      pool.query(`
        SELECT event_type, COUNT(*)::int AS count
        FROM civic_events
        GROUP BY event_type
        ORDER BY count DESC, event_type ASC
        LIMIT 12
      `),
      pool.query(`
        SELECT node_type, COUNT(*)::int AS count
        FROM world_nodes
        GROUP BY node_type
        ORDER BY count DESC, node_type ASC
      `),
      pool.query(`
        SELECT relationship_type, COUNT(*)::int AS count
        FROM world_edges
        GROUP BY relationship_type
        ORDER BY count DESC, relationship_type ASC
      `),
      pool.query(`
        SELECT intent_type, status, COUNT(*)::int AS count, ROUND(AVG(priority_score), 2)::float AS average_priority
        FROM intent_records
        GROUP BY intent_type, status
        ORDER BY count DESC, intent_type ASC
      `),
      pool.query(`
        SELECT id, event_type, subject_type, subject_id, scope_type, scope_id, payload, created_at
        FROM civic_events
        ORDER BY created_at DESC
        LIMIT 15
      `),
      pool.query(`
        SELECT id, intent_type, source_type, source_id, title, classification, priority_score, status, created_at
        FROM intent_records
        WHERE status IN ('active', 'open', 'in_progress')
        ORDER BY priority_score DESC, created_at DESC
        LIMIT 10
      `),
      pool.query(`
        SELECT id, name, category, urgency, urgency_level, status, complexity_score, created_at
        FROM needs
        WHERE status IN ('open', 'in_progress')
        ORDER BY
          CASE LOWER(COALESCE(urgency_level, urgency, 'medium'))
            WHEN 'critical' THEN 4
            WHEN 'high' THEN 3
            WHEN 'medium' THEN 2
            WHEN 'low' THEN 1
            ELSE 0
          END DESC,
          complexity_score DESC NULLS LAST,
          created_at DESC
        LIMIT 8
      `),
      pool.query(`
        SELECT
          e.id,
          source.label AS source_label,
          source.node_type AS source_type,
          target.label AS target_label,
          target.node_type AS target_type,
          e.relationship_type,
          e.created_at
        FROM world_edges e
        JOIN world_nodes source ON source.id = e.from_node_id
        JOIN world_nodes target ON target.id = e.to_node_id
        WHERE e.relationship_type IN ('spawned', 'contributes_to', 'declared', 'hosts')
        ORDER BY e.created_at DESC
        LIMIT 15
      `),
      CoordinationAgentService.getSignals()
    ]);

    const totals = {
      events: eventCounts.rows.reduce((sum, row) => sum + row.count, 0),
      nodes: nodeCounts.rows.reduce((sum, row) => sum + row.count, 0),
      relationships: relationshipCounts.rows.reduce((sum, row) => sum + row.count, 0),
      activeIntents: activeIntents.rows.length
    };

    return {
      totals,
      eventCounts: eventCounts.rows,
      nodeCounts: nodeCounts.rows,
      relationshipCounts: relationshipCounts.rows,
      intentCounts: intentCounts.rows,
      recentEvents: recentEvents.rows,
      activeIntents: activeIntents.rows,
      urgentNeeds: urgentNeeds.rows,
      missionLinks: missionLinks.rows,
      agentSignals
    };
  }
}

export default new CivicKernelSummaryService();
