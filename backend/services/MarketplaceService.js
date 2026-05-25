import pool from '../db.js';

class MarketplaceService {
  async getAllEntries(filters = {}) {
    const results = [];

    if (!filters.type || filters.type === 'needs') {
      const needs = await this.getNeeds(filters);
      results.push(...needs.map(n => ({ ...n, entry_type: 'need' })));
    }

    if (!filters.type || filters.type === 'offers' || filters.type === 'resources') {
      const resources = await this.getResources(filters);
      results.push(...resources.map(r => ({ ...r, entry_type: 'resource' })));
    }

    if (!filters.type || filters.type === 'missions' || filters.type === 'services') {
      const services = await this.getServices(filters);
      results.push(...services.map(s => ({ ...s, entry_type: 'service' })));
    }

    return results;
  }

  async getNeeds(filters) {
    let query = 'SELECT *, ST_AsGeoJSON(location_point) as location_point FROM needs WHERE status = \'open\'';
    const params = [];

    if (filters.communityId) {
      params.push(filters.communityId);
      query += ` AND requestor_community_id = $${params.length}`;
    }

    const result = await pool.query(query, params);
    return result.rows;
  }

  async getResources(filters) {
    let query = 'SELECT *, ST_AsGeoJSON(location_point) as location_point FROM resources WHERE status = \'available\'';
    const params = [];

    if (filters.communityId) {
      params.push(filters.communityId);
      query += ` AND owner_community_id = $${params.length}`;
    }

    const result = await pool.query(query, params);
    return result.rows;
  }

  async getServices(filters) {
    // Services are projects where is_service is true.
    // We filter by visibility 'public' or if it belongs to a community marketplace.
    let query = `
      SELECT * FROM projects
      WHERE is_service = TRUE
      AND (
        service_visibility IS NULL
        OR 'public' = ANY(service_visibility)
        OR 'marketplace' = ANY(service_visibility)
        OR 'profile' = ANY(service_visibility)
      )
    `;
    const params = [];

    if (filters.communityId) {
      params.push(`community:${filters.communityId}`);
      query += ` AND $${params.length} = ANY(service_visibility)`;
    }

    const result = await pool.query(query, params);
    return result.rows;
  }

  async getEntryById(type, id) {
    let query = '';
    switch (type) {
      case 'need':
        query = 'SELECT *, ST_AsGeoJSON(location_point) as location_point FROM needs WHERE id = $1';
        break;
      case 'resource':
        query = 'SELECT *, ST_AsGeoJSON(location_point) as location_point FROM resources WHERE id = $1';
        break;
      case 'service':
        query = 'SELECT * FROM projects WHERE id = $1 AND is_service = TRUE';
        break;
      default:
        throw new Error('Invalid entry type');
    }

    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  async getActivityStream() {
    // Aggregated activity from needs fulfilled, resources shared, services listed, etc.
    // For now, return recent creations and status changes.
    const query = `
      (SELECT 'need_created' as activity_type, name as title, created_at FROM needs ORDER BY created_at DESC LIMIT 5)
      UNION ALL
      (SELECT 'resource_created' as activity_type, name as title, created_at FROM resources ORDER BY created_at DESC LIMIT 5)
      UNION ALL
      (SELECT 'service_listed' as activity_type, name as title, created_at FROM projects WHERE is_service = TRUE ORDER BY created_at DESC LIMIT 5)
      ORDER BY created_at DESC LIMIT 15
    `;
    const result = await pool.query(query);
    return result.rows;
  }
}

export default new MarketplaceService();
