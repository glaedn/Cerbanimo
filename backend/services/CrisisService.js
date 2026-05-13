import pool from '../db.js';
import SpatialQueryService from './SpatialQueryService.js';
import FederationService from './FederationService.js';
import { sendNotification } from './NotificationService.js';

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

    if (enabled) {
      console.log('CRISIS MODE ENABLED:', crisisDetails);
      // Notify all users or specific regions? For now, log.
    }

    return value;
  }

  async evaluateAutoCrisis() {
    console.log('Evaluating automatic crisis triggers...');

    // 1. Detect Resource Deserts in major community hubs
    const communities = await pool.query("SELECT id, name, ST_Y(location_point::geometry) as lat, ST_X(location_point::geometry) as lon FROM communities WHERE location_point IS NOT NULL");

    for (const community of communities.rows) {
      const desertInfo = await SpatialQueryService.detectResourceDeserts(community.lat, community.lon, 50000); // 50km radius

      if (desertInfo.isDesert && desertInfo.needCount > 10) {
        console.log(`Resource desert detected around ${community.name}. Potential crisis trigger.`);

        const currentCrisis = await this.getCrisisMode();
        if (!currentCrisis.enabled) {
          await this.setCrisisMode(true, {
            type: 'resource_desert',
            region: community.name,
            severity: 'high',
            reason: `High volume of unmet needs (${desertInfo.needCount}) with low resource availability.`
          });

          // Notify allied communities
          const activeTreaties = await pool.query(
            "SELECT * FROM federation_treaties WHERE (community_a = $1 OR community_b = $1) AND status = 'active'",
            [community.id]
          );

          for (const treaty of activeTreaties.rows) {
            const alliedId = treaty.community_a === community.id ? treaty.community_b : treaty.community_a;
            await FederationService.recordFederationEvent(alliedId, 'crisis.ally_alert', {
              sourceCommunityId: community.id,
              region: community.name,
              reason: 'Resource desert crisis triggered'
            });
          }
        }
      }
    }

    // 2. Check for stale escalated needs
    const staleEscalated = await pool.query(`
      SELECT COUNT(*) FROM needs
      WHERE status = 'escalating'
      AND updated_at < NOW() - INTERVAL '72 hours'
    `);

    if (parseInt(staleEscalated.rows[0].count) > 5) {
       console.log('Multiple escalated needs remain unmet for >72h. Triggering regional alert.');
       // This could also trigger crisis mode or specific regional alerts
    }
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
