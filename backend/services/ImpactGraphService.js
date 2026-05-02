import pool from '../db.js';

class ImpactGraphService {
  async createOutcome(projectId, statement) {
    const query = `
      INSERT INTO outcomes (project_id, statement)
      VALUES ($1, $2)
      RETURNING *;
    `;
    const result = await pool.query(query, [projectId, statement]);
    const outcome = result.rows[0];

    // Create impact node for the outcome
    await this.createImpactNode('outcome', outcome.id, outcome.statement);

    return outcome;
  }

  async createImpactNode(type, entityId, label, description = '') {
    const query = `
      INSERT INTO impact_nodes (type, entity_id, label, description)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const result = await pool.query(query, [type, entityId, label, description]);
    return result.rows[0];
  }

  async linkNodes(fromNodeId, toNodeId, relationType) {
    const query = `
      INSERT INTO impact_edges (from_node_id, to_node_id, relation_type)
      VALUES ($1, $2, $3)
      RETURNING *;
    `;
    const result = await pool.query(query, [fromNodeId, toNodeId, relationType]);
    return result.rows[0];
  }

  async getImpactTrace(taskId) {
    // Trace Task -> Project -> Outcome
    const query = `
      WITH RECURSIVE impact_trace AS (
        SELECT id, type, entity_id, label FROM impact_nodes WHERE type = 'task' AND entity_id = $1
        UNION
        SELECT n.id, n.type, n.entity_id, n.label
        FROM impact_nodes n
        JOIN impact_edges e ON n.id = e.to_node_id
        JOIN impact_trace it ON e.from_node_id = it.id
      )
      SELECT * FROM impact_trace;
    `;
    const result = await pool.query(query, [taskId]);
    return result.rows;
  }
}

export default new ImpactGraphService();
