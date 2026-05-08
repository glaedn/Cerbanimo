import pool from '../db.js';

class SpatialQueryService {
  /**
   * Find nearby users or communities with specific capabilities (skills).
   */
  async findNearbyCapability(latitude, longitude, radiusMeters, skillIds = []) {
    const query = `
      SELECT id, username as name, 'user' as type, ST_Distance(location_point, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) as distance
      FROM users
      WHERE ST_DWithin(location_point, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3)
      ${skillIds.length > 0 ? 'AND skills ?| $4' : ''}
      UNION ALL
      SELECT id, name, 'community' as type, ST_Distance(location_point, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) as distance
      FROM communities
      WHERE ST_DWithin(location_point, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3)
      ORDER BY distance ASC;
    `;
    const params = [longitude, latitude, radiusMeters];
    if (skillIds.length > 0) params.push(skillIds);

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Get resource density in a specific area.
   */
  async getResourceDensity(latitude, longitude, radiusMeters) {
    const query = `
      SELECT COALESCE(category, resource_type) as category, COUNT(*) as count
      FROM resources
      WHERE ST_DWithin(location_point, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3)
      GROUP BY 1;
    `;
    const result = await pool.query(query, [longitude, latitude, radiusMeters]);
    return result.rows;
  }

  /**
   * Identify resource deserts (areas with high needs but low resource density).
   */
  async detectResourceDeserts(latitude, longitude, radiusMeters) {
    const needsQuery = `
      SELECT COUNT(*) as need_count
      FROM needs
      WHERE ST_DWithin(location_point, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3)
      AND status = 'open';
    `;
    const resourcesQuery = `
      SELECT COUNT(*) as resource_count
      FROM resources
      WHERE ST_DWithin(location_point, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3)
      AND status = 'available';
    `;

    const needsResult = await pool.query(needsQuery, [longitude, latitude, radiusMeters]);
    const resourcesResult = await pool.query(resourcesQuery, [longitude, latitude, radiusMeters]);

    const needCount = parseInt(needsResult.rows[0].need_count);
    const resourceCount = parseInt(resourcesResult.rows[0].resource_count);

    return {
      needCount,
      resourceCount,
      isDesert: needCount > 5 && resourceCount < 2,
      ratio: resourceCount > 0 ? needCount / resourceCount : needCount
    };
  }
}

export default new SpatialQueryService();
