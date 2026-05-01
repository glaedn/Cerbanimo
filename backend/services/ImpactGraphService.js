import pool from '../db.js';

class ImpactGraphService {
  async createOutcome(projectId, statement) {
    const existing = await pool.query(
      'SELECT * FROM outcomes WHERE project_id = $1 AND statement = $2 ORDER BY id ASC LIMIT 1',
      [projectId, statement]
    );
    if (existing.rows.length > 0) {
      const outcome = existing.rows[0];
      await this.createImpactNode('outcome', outcome.id, outcome.statement);
      return outcome;
    }

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

  async getOutcomes(projectId) {
    const query = 'SELECT * FROM outcomes WHERE project_id = $1 ORDER BY id ASC';
    const result = await pool.query(query, [projectId]);
    return result.rows;
  }

  async createImpactNode(type, entityId, label, description = '', impactWeight = null) {
    const existing = await pool.query(
      'SELECT * FROM impact_nodes WHERE type = $1 AND entity_id = $2 ORDER BY id ASC LIMIT 1',
      [type, entityId]
    );
    if (existing.rows.length > 0) {
      const result = await pool.query(
        `UPDATE impact_nodes
         SET label = COALESCE($2, label),
             description = COALESCE($3, description),
             impact_weight = COALESCE($4, impact_weight)
         WHERE id = $1
         RETURNING *`,
        [existing.rows[0].id, label, description, impactWeight]
      );
      return result.rows[0];
    }

    const query = `
      INSERT INTO impact_nodes (type, entity_id, label, description, impact_weight)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const result = await pool.query(query, [type, entityId, label, description, impactWeight]);
    return result.rows[0];
  }

  async linkNodes(fromNodeId, toNodeId, relationType) {
    const existing = await pool.query(
      'SELECT * FROM impact_edges WHERE from_node_id = $1 AND to_node_id = $2 AND relation_type = $3 LIMIT 1',
      [fromNodeId, toNodeId, relationType]
    );
    if (existing.rows.length > 0) {
      return existing.rows[0];
    }

    const query = `
      INSERT INTO impact_edges (from_node_id, to_node_id, relation_type)
      VALUES ($1, $2, $3)
      RETURNING *;
    `;
    const result = await pool.query(query, [fromNodeId, toNodeId, relationType]);
    return result.rows[0];
  }

  async createTaskImpactNodesForProject(projectId, tasks = []) {
    if (!projectId || !Array.isArray(tasks) || tasks.length === 0) {
      return [];
    }

    const outcomeResult = await pool.query(
      'SELECT id, statement FROM outcomes WHERE project_id = $1 ORDER BY id ASC LIMIT 1',
      [projectId]
    );
    if (outcomeResult.rows.length === 0) {
      return [];
    }

    const outcome = outcomeResult.rows[0];
    const outcomeNode = await this.createImpactNode('outcome', outcome.id, outcome.statement);
    const createdNodes = [];

    for (const task of tasks) {
      const taskId = task.db_id || task.db_id_internal || task.id;
      if (!taskId) continue;

      const label = task.impact_label || task.impact_statement || `Contributes to the project outcome through: ${task.name}`;
      const weight = Number.isFinite(Number(task.impact_weight)) ? Number(task.impact_weight) : null;
      const taskNode = await this.createImpactNode('task', taskId, label, task.description || '', weight);
      await this.linkNodes(taskNode.id, outcomeNode.id, 'contributes_to');
      createdNodes.push(taskNode);
    }

    return createdNodes;
  }

  async getImpactTrace(taskId) {
    const query = `
      WITH RECURSIVE impact_trace AS (
        SELECT id, type, entity_id, label, description, impact_weight FROM impact_nodes WHERE type = 'task' AND entity_id = $1
        UNION
        SELECT n.id, n.type, n.entity_id, n.label, n.description, n.impact_weight
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
    let nodesQuery = 'SELECT id, type, entity_id, label, description, impact_weight FROM impact_nodes';
    let edgesQuery = 'SELECT from_node_id, to_node_id, relation_type FROM impact_edges';
    let params = [];

    if (projectId) {
      nodesQuery = `
        SELECT DISTINCT n.* FROM impact_nodes n
        LEFT JOIN outcomes o ON n.entity_id = o.id AND n.type = 'outcome'
        LEFT JOIN tasks t ON n.entity_id = t.id AND n.type = 'task'
        WHERE o.project_id = $1
           OR t.project_id = $1
           OR (n.type = 'project' AND n.entity_id = $1)
      `;
      params = [projectId];
    } else if (realmId) {
       // Filter by community/realm
       nodesQuery = `
        SELECT DISTINCT n.* FROM impact_nodes n
        LEFT JOIN outcomes o ON n.entity_id = o.id AND n.type = 'outcome'
        LEFT JOIN tasks t ON n.entity_id = t.id AND n.type = 'task'
        LEFT JOIN projects p ON o.project_id = p.id OR t.project_id = p.id OR (n.type = 'project' AND n.entity_id = p.id)
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

  async calculateImpactDepth(taskId) {
    // Find the shortest distance from a task impact node to any outcome impact node.
    // Base case: Find the impact node for the task.
    // Then use a recursive CTE to traverse upwards through impact_edges.
    const query = `
      WITH RECURSIVE impact_path AS (
        SELECT from_node_id, to_node_id, 1 as depth
        FROM impact_edges
        WHERE from_node_id = (SELECT id FROM impact_nodes WHERE type = 'task' AND entity_id = $1 LIMIT 1)
        UNION ALL
        SELECT e.from_node_id, e.to_node_id, ip.depth + 1
        FROM impact_edges e
        JOIN impact_path ip ON e.from_node_id = ip.to_node_id
        WHERE ip.depth < 10 -- Safety limit
      )
      SELECT MIN(ip.depth) as impact_depth
      FROM impact_path ip
      JOIN impact_nodes n ON ip.to_node_id = n.id
      WHERE n.type = 'outcome';
    `;
    const result = await pool.query(query, [taskId]);
    return parseInt(result.rows[0].impact_depth) || 0;
  }
}

export default new ImpactGraphService();
