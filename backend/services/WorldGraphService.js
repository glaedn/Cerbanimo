import pool from '../db.js';

class WorldGraphService {
  queryRunner(client = null) {
    return client || pool;
  }

  async upsertNode(node, client = null) {
    const db = this.queryRunner(client);
    const {
      nodeType,
      entityType = null,
      entityId = null,
      label,
      description = '',
      status = null,
      properties = {}
    } = node;

    if (!nodeType) throw new Error('nodeType is required.');
    if (!label) throw new Error('label is required.');

    if (entityType && entityId) {
      const result = await db.query(
        `INSERT INTO world_nodes (node_type, entity_type, entity_id, label, description, status, properties)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
         ON CONFLICT (node_type, entity_type, entity_id)
         WHERE entity_type IS NOT NULL AND entity_id IS NOT NULL
         DO UPDATE SET
           label = EXCLUDED.label,
           description = COALESCE(EXCLUDED.description, world_nodes.description),
           status = COALESCE(EXCLUDED.status, world_nodes.status),
           properties = world_nodes.properties || EXCLUDED.properties
         RETURNING *`,
        [
          nodeType,
          entityType,
          entityId,
          label,
          description,
          status,
          JSON.stringify(properties || {})
        ]
      );
      return result.rows[0];
    }

    const result = await db.query(
      `INSERT INTO world_nodes (node_type, entity_type, entity_id, label, description, status, properties)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
       RETURNING *`,
      [
        nodeType,
        entityType,
        entityId,
        label,
        description,
        status,
        JSON.stringify(properties || {})
      ]
    );
    return result.rows[0];
  }

  async linkNodes(fromNodeId, toNodeId, relationshipType, properties = {}, confidence = 1, client = null) {
    const db = this.queryRunner(client);

    if (!fromNodeId || !toNodeId) throw new Error('fromNodeId and toNodeId are required.');
    if (!relationshipType) throw new Error('relationshipType is required.');

    const result = await db.query(
      `INSERT INTO world_edges (from_node_id, to_node_id, relationship_type, confidence, properties)
       VALUES ($1, $2, $3, $4, $5::jsonb)
       ON CONFLICT (from_node_id, to_node_id, relationship_type)
       DO UPDATE SET
         confidence = GREATEST(world_edges.confidence, EXCLUDED.confidence),
         properties = world_edges.properties || EXCLUDED.properties
       RETURNING *`,
      [
        fromNodeId,
        toNodeId,
        relationshipType,
        confidence,
        JSON.stringify(properties || {})
      ]
    );

    return result.rows[0];
  }

  async linkEntities(fromEntity, toEntity, relationshipType, properties = {}, confidence = 1, client = null) {
    const fromNode = await this.upsertNode(fromEntity, client);
    const toNode = await this.upsertNode(toEntity, client);
    const edge = await this.linkNodes(fromNode.id, toNode.id, relationshipType, properties, confidence, client);
    return { fromNode, toNode, edge };
  }

  async getEntityNeighborhood(entityType, entityId, depth = 1) {
    const maxDepth = Math.min(Number(depth) || 1, 3);
    const result = await pool.query(
      `WITH RECURSIVE neighborhood AS (
         SELECT n.*, 0 AS depth
         FROM world_nodes n
         WHERE n.entity_type = $1 AND n.entity_id = $2

         UNION

         SELECT next_node.*, neighborhood.depth + 1 AS depth
         FROM neighborhood
         JOIN world_edges e
           ON e.from_node_id = neighborhood.id OR e.to_node_id = neighborhood.id
         JOIN world_nodes next_node
           ON next_node.id = CASE
             WHEN e.from_node_id = neighborhood.id THEN e.to_node_id
             ELSE e.from_node_id
           END
         WHERE neighborhood.depth < $3
       )
       SELECT DISTINCT * FROM neighborhood ORDER BY depth ASC, id ASC`,
      [entityType, entityId, maxDepth]
    );

    const nodeIds = result.rows.map((node) => node.id);
    if (nodeIds.length === 0) {
      return { nodes: [], links: [] };
    }

    const edges = await pool.query(
      `SELECT *
       FROM world_edges
       WHERE from_node_id = ANY($1) AND to_node_id = ANY($1)
       ORDER BY id ASC`,
      [nodeIds]
    );

    return {
      nodes: result.rows,
      links: edges.rows.map((edge) => ({
        source: edge.from_node_id,
        target: edge.to_node_id,
        relationship: edge.relationship_type,
        confidence: edge.confidence,
        properties: edge.properties
      }))
    };
  }
}

export default new WorldGraphService();
