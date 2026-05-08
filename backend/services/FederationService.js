import pool from '../db.js';

class FederationService {
  async createTreaty(communityA, communityB, type, terms) {
    const query = `
      INSERT INTO federation_treaties (community_a, community_b, treaty_type, terms, status)
      VALUES ($1, $2, $3, $4, 'proposed')
      RETURNING *
    `;
    const result = await pool.query(query, [communityA, communityB, type, terms]);

    // Record event for both communities
    await this.recordFederationEvent(communityA, 'treaty.proposed', { treatyId: result.rows[0].id, otherCommunity: communityB });
    await this.recordFederationEvent(communityB, 'treaty.proposed', { treatyId: result.rows[0].id, otherCommunity: communityA });

    return result.rows[0];
  }

  async updateTreatyStatus(treatyId, status) {
    const query = `
      UPDATE federation_treaties
      SET status = $1
      WHERE id = $2
      RETURNING *
    `;
    const result = await pool.query(query, [status, treatyId]);

    if (result.rows.length > 0) {
      const treaty = result.rows[0];
      await this.recordFederationEvent(treaty.community_a, `treaty.${status}`, { treatyId });
      await this.recordFederationEvent(treaty.community_b, `treaty.${status}`, { treatyId });
    }

    return result.rows[0];
  }

  async alignSharedMission(treatyId, missionId) {
    const query = `
      UPDATE federation_treaties
      SET terms = jsonb_set(terms, '{sharedMissions}',
        COALESCE(terms->'sharedMissions', '[]'::jsonb) || to_jsonb($1::int), true)
      WHERE id = $2
      RETURNING *
    `;
    const result = await pool.query(query, [missionId, treatyId]);
    return result.rows[0];
  }

  async recordFederationEvent(communityId, eventType, payload) {
    await pool.query(
      'INSERT INTO governance_events (community_id, event_type, payload) VALUES ($1, $2, $3)',
      [communityId, eventType, payload]
    );
  }

  async getFederationAtlas() {
     const query = `
       SELECT ft.*,
              c1.name as community_a_name,
              c2.name as community_b_name
       FROM federation_treaties ft
       JOIN communities c1 ON ft.community_a = c1.id
       JOIN communities c2 ON ft.community_b = c2.id
       WHERE ft.status = 'active'
     `;
     const result = await pool.query(query);
     return result.rows;
  }
}

export default new FederationService();
