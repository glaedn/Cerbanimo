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
    const query = `
      WITH RECURSIVE impact_trace AS (
        SELECT id, type, entity_id, label FROM impact_nodes WHERE type = 'task' AND entity_id = $1
        UNION
        SELECT n.id, n.type, n.entity_id, n.label
        FROM impact_nodes n
        JOIN impact_edges e ON e.to_node_id = n.id
        JOIN impact_trace it ON e.from_node_id = it.id
      )
      SELECT * FROM impact_trace;
    `;
    const result = await pool.query(query, [taskId]);
    return result.rows;
  }

  async getAtlasData(projectId = null, realmId = null) {
    let nodesQuery = 'SELECT id, type, entity_id, label FROM impact_nodes';
    let edgesQuery = 'SELECT from_node_id, to_node_id, relation_type FROM impact_edges';
    let params = [];

    if (projectId) {
      nodesQuery = `
        SELECT DISTINCT n.* FROM impact_nodes n
        LEFT JOIN outcomes o ON n.entity_id = o.id AND n.type = 'outcome'
        WHERE o.project_id = $1 OR (n.type = 'project' AND n.entity_id = $1)
      `;
      params = [projectId];
    } else if (realmId) {
       // Filter by community/realm
       nodesQuery = `
        SELECT DISTINCT n.* FROM impact_nodes n
        LEFT JOIN outcomes o ON n.entity_id = o.id AND n.type = 'outcome'
        LEFT JOIN projects p ON o.project_id = p.id OR (n.type = 'project' AND n.entity_id = p.id)
        WHERE p.community_id = $1
       `;
       params = [realmId];
    }

    const nodes = await pool.query(nodesQuery, params);
    const nodeIds = nodes.rows.map(n => n.id);

    if (nodeIds.length > 0) {
      edgesQuery = `
        SELECT from_node_id, to_node_id, relation_type
        FROM impact_edges
        WHERE from_node_id = ANY($1) AND to_node_id = ANY($1)
      `;
      const edges = await pool.query(edgesQuery, [nodeIds]);
      return { nodes: nodes.rows, links: edges.rows.map(e => ({ source: e.from_node_id, target: e.to_node_id, relation: e.relation_type })) };
    }

    return { nodes: [], links: [] };
  }
}

export default new ImpactGraphService();
