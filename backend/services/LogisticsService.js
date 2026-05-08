import pool from '../db.js';

class LogisticsService {
  /**
   * Assign a route to a volunteer and track efficiency.
   */
  async assignRoute(userId, originLat, originLon, destLat, destLon) {
    const query = `
      INSERT INTO dispatch_routes (origin, destination, assigned_user_id, status)
      VALUES (
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
        ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography,
        $5,
        'active'
      )
      RETURNING id;
    `;
    const result = await pool.query(query, [originLon, originLat, destLon, destLat, userId]);
    return result.rows[0].id;
  }

  /**
   * Check volunteer fatigue by counting active routes or recent completions.
   */
  async checkVolunteerFatigue(userId) {
    const activeRes = await pool.query("SELECT COUNT(*) FROM dispatch_routes WHERE assigned_user_id = $1 AND status = 'active'", [userId]);
    const recentRes = await pool.query("SELECT COUNT(*) FROM dispatch_routes WHERE assigned_user_id = $1 AND status = 'completed' AND updated_at > NOW() - INTERVAL '24 hours'", [userId]);

    const activeCount = parseInt(activeRes.rows[0].count);
    const recentCount = parseInt(recentRes.rows[0].count);

    return {
      activeCount,
      recentCount,
      fatigueLevel: activeCount > 2 || recentCount > 5 ? 'high' : (activeCount > 0 || recentCount > 2 ? 'medium' : 'low')
    };
  }

  /**
   * Update route status and record actual time.
   */
  async updateRouteStatus(routeId, status, actualTimeMinutes = null) {
    const query = `
      UPDATE dispatch_routes
      SET status = $1, actual_time_minutes = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING *;
    `;
    const result = await pool.query(query, [status, actualTimeMinutes, routeId]);
    return result.rows[0];
  }
}

export default new LogisticsService();
