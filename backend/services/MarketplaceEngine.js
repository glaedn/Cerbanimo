import pool from '../db.js';
import MarketplaceService from './MarketplaceService.js';
import CrisisService from './CrisisService.js';

class MarketplaceEngine {
  async discover(userId, filters = {}) {
    // 1. Get all raw entries
    const entries = await MarketplaceService.getAllEntries(filters);

    // 2. Get Crisis Mode status
    const crisis = await CrisisService.getCrisisMode();

    // 3. Score and Rank entries
    const scoredEntries = entries.map(entry => {
      let score = this.calculateBaseScore(entry);

      // Crisis Mode overrides
      if (crisis.enabled) {
        score = this.applyCrisisScoring(entry, score, crisis);
      }

      return { ...entry, matchScore: score };
    });

    // 4. Sort by score
    scoredEntries.sort((a, b) => b.matchScore - a.matchScore);

    return scoredEntries;
  }

  calculateBaseScore(entry) {
    let score = 100;

    // Urgency boosts
    if (entry.urgency === 'critical') score += 500;
    if (entry.urgency === 'high') score += 100;

    // Recency boost (simple decay could be added)
    const ageInHours = (new Date() - new Date(entry.created_at)) / (1000 * 60 * 60);
    if (ageInHours < 24) score += 50;

    return score;
  }

  applyCrisisScoring(entry, currentScore, crisis) {
    let score = currentScore;

    const essentialCategories = ['medical', 'food', 'shelter', 'transportation', 'energy', 'water', 'communications'];
    const isEssential = essentialCategories.includes(entry.category?.toLowerCase());

    if (isEssential) {
      score += 1000; // Major boost for essentials during crisis
    } else if (entry.urgency !== 'high' && entry.urgency !== 'critical') {
      score -= 500; // De-prioritize non-essential/non-urgent items
    }

    return score;
  }

  async getNearby(userId, lat, lon, radius = 50000) { // Default 50km
    const query = `
      SELECT *, ST_Distance(location_point, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography) as distance
      FROM (
        SELECT id, name, description, 'need' as entry_type, location_point, urgency, category, created_at, NULL as price, NULL as service_price FROM needs WHERE status = 'open'
        UNION ALL
        SELECT id, name, description, 'resource' as entry_type, location_point, 'medium' as urgency, category, created_at, price, NULL as service_price FROM resources WHERE status = 'available'
        UNION ALL
        SELECT id, name, description, 'service' as entry_type, location_point, 'medium' as urgency, category, created_at, NULL as price, service_price FROM projects WHERE is_service = TRUE
      ) as combined
      WHERE ST_DWithin(location_point, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography, $3)
      ORDER BY distance ASC
    `;
    const result = await pool.query(query, [lat, lon, radius]);
    return result.rows;
  }
}

export default new MarketplaceEngine();
