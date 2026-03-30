// backend/services/ResourceService.js

/**
 * ResourceService manages the inventory of equipment, spaces, and skills-as-a-service.
 * Resources are owned by users, projects, or communities.
 */
class ResourceService {
  constructor(dbPool) {
    this.db = dbPool;
  }

  /**
   * Create a new resource entry.
   * @param {Object} resource
   * @returns {Promise<Object>}
   */
  async createResource(resource) {
    const { rows: result } = await this.db.query(
      `INSERT INTO resources (name, type, owner_id, owner_type, availability_window_start, availability_window_end, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [resource.name, resource.type, resource.owner_id, resource.owner_type, resource.availability_window_start, resource.availability_window_end, resource.metadata]
    );

    // Resource owners get a story entry for their contribution (Phase 5)
    await this.db.query(
      'INSERT INTO user_stories (user_id, story_type, summary) VALUES ($1, \'resource_contribution\', $2)',
      [resource.owner_id, `You contributed ${resource.name} (${resource.type}) to the system.`]
    );

    return result[0];
  }

  async getAllResources() {
    const { rows } = await this.db.query('SELECT * FROM resources');
    return rows;
  }

  async getResourceById(id) {
    const { rows } = await this.db.query('SELECT * FROM resources WHERE id = $1', [id]);
    return rows[0];
  }

  async deleteResource(id) {
    // In a real system, you'd check for active allocations first
    await this.db.query('DELETE FROM resources WHERE id = $1', [id]);
  }
}

export default ResourceService;
