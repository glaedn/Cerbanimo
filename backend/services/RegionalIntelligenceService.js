import pool from '../db.js';
import SpatialQueryService from './SpatialQueryService.js';

class RegionalIntelligenceService {
  /**
   * Update metrics for all defined regions.
   */
  async updateAllRegionalMetrics() {
    const regions = await pool.query("SELECT id, name, ST_Y(geometry::geometry) as lat, ST_X(geometry::geometry) as lon FROM locations WHERE region_type = 'mutual_aid_region'");

    for (const region of regions.rows) {
      const radius = 5000; // Default 5km for metric calculation, could be dynamic
      const desertStats = await SpatialQueryService.detectResourceDeserts(region.lat, region.lon, radius);

      // Calculate response latency (avg time from need created to fulfilled in this region)
      const latencyRes = await pool.query(`
        SELECT AVG(EXTRACT(EPOCH FROM (fulfilled_at - created_at))) / 3600 as avg_latency_hours
        FROM needs
        WHERE ST_DWithin(location_point, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3)
        AND fulfilled_at IS NOT NULL
        AND created_at > NOW() - INTERVAL '30 days';
      `, [region.lon, region.lat, radius]);

      const latency = parseFloat(latencyRes.rows[0].avg_latency_hours) || 0;
      const strain = (desertStats.ratio * 0.6) + (latency * 0.4);
      const readiness = 100 - Math.min(100, strain * 10);

      await pool.query(`
        INSERT INTO regional_metrics (region_id, need_density, resource_density, response_latency, civic_strain_indicator, response_readiness_score)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (region_id) DO UPDATE SET
          need_density = EXCLUDED.need_density,
          resource_density = EXCLUDED.resource_density,
          response_latency = EXCLUDED.response_latency,
          civic_strain_indicator = EXCLUDED.civic_strain_indicator,
          response_readiness_score = EXCLUDED.response_readiness_score,
          updated_at = NOW();
      `, [region.id, desertStats.needCount, desertStats.resourceCount, latency, strain, readiness]);
    }
  }

  async getRegionalHealth(regionId) {
    const result = await pool.query(`
      SELECT rm.*, l.name as region_name
      FROM regional_metrics rm
      JOIN locations l ON rm.region_id = l.id
      WHERE rm.region_id = $1
    `, [regionId]);
    return result.rows[0];
  }
}

export default new RegionalIntelligenceService();
