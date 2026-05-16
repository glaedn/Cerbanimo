import pool from '../db.js';

export const RELATIONSHIPS = {
  CONTRIBUTES_TO: 'CONTRIBUTES_TO',
  TRUSTS: 'TRUSTS',
  BLOCKED_BY: 'BLOCKED_BY',
  LOCATED_NEAR: 'LOCATED_NEAR',
  MEMBER_OF: 'MEMBER_OF',
  ESCALATED_FROM: 'ESCALATED_FROM',
  DEPENDS_ON: 'DEPENDS_ON',
  MENTORS: 'MENTORS',
  FULFILLS: 'FULFILLS',
  DECLARED: 'DECLARED',
  HOSTS: 'HOSTS',
  SPAWNED: 'SPAWNED'
};

class WorldGraphService {
  constructor() {
    this.graphName = 'world_graph';
    this.initialized = false;
    this.initPromise = null;
  }

  queryRunner(client = null) {
    return client || pool;
  }

  async initializeGraph() {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      let client;
      try {
        client = await pool.connect();
        if (!client) throw new Error('Failed to obtain client from pool');

        await client.query('CREATE EXTENSION IF NOT EXISTS age');

        // Check if graph exists - using explicit schema qualification
        const checkGraph = await client.query(`SELECT count(*) FROM ag_catalog.ag_graph WHERE name = $1`, [this.graphName]);
        if (parseInt(checkGraph.rows[0].count) === 0) {
          await client.query(`SELECT ag_catalog.create_graph($1)`, [this.graphName]);
        }
        this.initialized = true;
        console.log(`Apache AGE: Graph "${this.graphName}" initialized.`);
      } catch (err) {
        console.error('Apache AGE initialization failed. Falling back to relational queries if necessary.', err.message);
      } finally {
        if (client && client.release) client.release();
        this.initPromise = null;
      }
    })();

    return this.initPromise;
  }

  async executeCypher(query, params = {}, client = null) {
    await this.initializeGraph();
    const db = this.queryRunner(client);

    // Explicitly qualify cypher function with ag_catalog schema
    const cypherQuery = `
      SELECT * FROM ag_catalog.cypher($1, $$
        ${query}
      $$, $2) AS (result ag_catalog.agtype);
    `;

    try {
      const result = await db.query(cypherQuery, [this.graphName, JSON.stringify(params)]);
      return result.rows || [];
    } catch (err) {
      console.error('Cypher execution error:', err.message, '\nQuery:', query);
      return [];
    }
  }

  async upsertNode(node, client = null) {
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

    const cypher = `
      MERGE (n:${nodeType} { entityType: $entityType, entityId: $entityId })
      SET n.label = $label,
          n.description = $description,
          n.status = $status,
          n.properties = $properties
      RETURN n
    `;

    const params = {
      entityType,
      entityId,
      label,
      description,
      status,
      properties: properties || {}
    };

    const result = await this.executeCypher(cypher, params, client);
    return result[0]?.result;
  }

  async linkNodes(fromNodeFilter, toNodeFilter, relationshipType, properties = {}, confidence = 1, client = null) {
    if (!fromNodeFilter || !toNodeFilter) throw new Error('Source and target filters are required.');
    if (!relationshipType) throw new Error('relationshipType is required.');

    const cypher = `
      MATCH (a { entityType: $fromET, entityId: $fromEID })
      MATCH (b { entityType: $toET, entityId: $toEID })
      MERGE (a)-[r:${relationshipType}]->(b)
      SET r.confidence = $confidence,
          r.properties = $properties
      RETURN r
    `;

    const params = {
      fromET: fromNodeFilter.entityType,
      fromEID: fromNodeFilter.entityId,
      toET: toNodeFilter.entityType,
      toEID: toNodeFilter.entityId,
      confidence,
      properties: properties || {}
    };

    const result = await this.executeCypher(cypher, params, client);
    return result[0]?.result;
  }

  async linkEntities(fromEntity, toEntity, relationshipType, properties = {}, confidence = 1, client = null) {
    await this.upsertNode(fromEntity, client);
    await this.upsertNode(toEntity, client);

    const fromFilter = { entityType: fromEntity.entityType, entityId: fromEntity.entityId };
    const toFilter = { entityType: toEntity.entityType, entityId: toEntity.entityId };

    const edge = await this.linkNodes(fromFilter, toFilter, relationshipType, properties, confidence, client);
    return { edge };
  }

  // Legacy support or relational bridge
  async getEntityNeighborhood(entityType, entityId, depth = 1) {
    const cypher = `
      MATCH (n { entityType: $entityType, entityId: $entityId })-[r*1..${Math.min(depth, 3)}]-(m)
      RETURN n, r, m
    `;
    const params = { entityType, entityId };
    return this.executeCypher(cypher, params);
  }

  // Cognition Substrate Methods

  async findTrustedVolunteersNear(locationText, radius = 0) {
    const cypher = `
      MATCH (p:person)-[:TRUSTS*1..2]-(peer:person)
      WHERE peer.properties.locationText = $locationText
      RETURN DISTINCT peer
    `;
    return this.executeCypher(cypher, { locationText });
  }

  async findAdjacentNeeds(needId) {
    const cypher = `
      MATCH (n:need { entityId: $needId })
      MATCH (adjacent:need)
      WHERE adjacent.entityId <> $needId
        AND (adjacent.properties.category = n.properties.category
             OR EXISTS((n)-[:HOSTS|DECLARED]-(:community)-[:HOSTS|DECLARED]-(adjacent)))
      RETURN DISTINCT adjacent
    `;
    return this.executeCypher(cypher, { needId });
  }

  async findBurnoutPropagation(userId) {
    const cypher = `
      MATCH (p:person { entityId: $userId })-[:CONTRIBUTES_TO]->(t:task)
      MATCH path = (t)-[:DEPENDS_ON|BLOCKED_BY*1..5]->(dep:task)
      RETURN path
    `;
    return this.executeCypher(cypher, { userId });
  }

  async findSkillBottlenecks(communityId) {
    const cypher = `
      MATCH (c:community { entityId: $communityId })-[:HOSTS]->(n:need)
      WHERE n.status = 'open'
      MATCH (n)-[:SPAWNED]->(m:mission)-[:CONTRIBUTES_TO]->(t:task)
      WHERE t.status CONTAINS 'unassigned'
      RETURN t.properties.skill_name as skill, count(t) as gap
      ORDER BY gap DESC
    `;
    return this.executeCypher(cypher, { communityId });
  }
}

export default new WorldGraphService();
