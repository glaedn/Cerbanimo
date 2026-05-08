import pool from '../db.js';

class CrisisService {
  async getCrisisMode() {
    const result = await pool.query("SELECT value FROM system_state WHERE key = 'crisis_mode'");
    return result.rows[0]?.value || { enabled: false, active_crises: [] };
  }

  async setCrisisMode(enabled, crisisDetails = {}) {
    const value = {
      enabled,
      ...crisisDetails,
      updated_at: new Date()
    };
    await pool.query("UPDATE system_state SET value = $1, updated_at = NOW() WHERE key = 'crisis_mode'", [value]);
    return value;
  }

  async getTacticalOverlay() {
    const crisis = await this.getCrisisMode();
    if (!crisis.enabled) return null;

    const activeMissions = await pool.query(`
      SELECT id, name, location_point, status
      FROM projects
      WHERE status = 'active' AND is_expanded = true
    `);

    const urgentNeeds = await pool.query(`
      SELECT id, name, location_point, urgency
      FROM needs
      WHERE status = 'open' AND urgency IN ('high', 'critical')
    `);

    const rescueReserves = await pool.query(`
      SELECT id, name, location_point
      FROM resources
      WHERE status = 'available' AND (category = 'emergency' OR resource_type = 'emergency')
    `);

    return {
      crisis,
      activeMissions: activeMissions.rows,
      urgentNeeds: urgentNeeds.rows,
      rescueReserves: rescueReserves.rows
    };
  }
}

export default new CrisisService();
