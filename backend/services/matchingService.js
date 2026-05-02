// backend/services/matchingService.js

const URGENCY_SCORES = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    0.5 - Math.cos(dLat) / 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    (1 - Math.cos(dLon)) / 2;
  return R * 2 * Math.asin(Math.sqrt(a)); // Distance in km
};

const isResourceAvailableAt = (resource, dateTime) => {
  if (!resource.availability_schedule) return true;
  if (!dateTime) return true;

  const date = new Date(dateTime);
  const dayOfWeek = date.toLocaleString('en-US', { weekday: 'long' }).toLowerCase();
  const timeString = date.toTimeString().slice(0, 5); // "HH:MM"

  const schedule = resource.availability_schedule;
  if (schedule[dayOfWeek]) {
    return schedule[dayOfWeek].some(slot => {
      return timeString >= slot.start && timeString <= slot.end;
    });
  }
  return false;
};

const findMatchesForNeed = async (needId, dbPool, radiusKm = 50) => {
  try {
    const needResult = await dbPool.query('SELECT * FROM needs WHERE id = $1', [needId]);
    if (needResult.rows.length === 0) {
      console.warn(`Need with ID ${needId} not found.`);
      return { resources: [], users: [] };
    }
    const need = needResult.rows[0];

    // Only match needs that are currently 'open' or 'escalating'
    if (need.status !== 'open' && need.status !== 'escalating') {
      console.log(`Need ID ${needId} is not open or escalating (status: ${need.status}). No matches will be sought.`);
      return { resources: [], users: [] };
    }

    const needLat = parseFloat(need.location?.latitude || need.latitude);
    const needLon = parseFloat(need.location?.longitude || need.longitude);

    // Bounding box approximation (1 degree is approx 111km)
    const latDelta = radiusKm / 111;
    const lonDelta = needLat ? radiusKm / (111 * Math.cos(needLat * Math.PI / 180)) : latDelta;

    // --- 1. Match Resources ---
    let resourceQueryText = 'SELECT * FROM resources WHERE category = $1 AND status = $2';
    const resourceParams = [need.category, 'available'];
    let paramIndex = 3;

    resourceQueryText += ' AND (availability_window_end IS NULL OR availability_window_end >= NOW())';

    if (needLat && needLon) {
      resourceQueryText += ` AND (latitude BETWEEN $${paramIndex++} AND $${paramIndex++})
                            AND (longitude BETWEEN $${paramIndex++} AND $${paramIndex++})`;
      resourceParams.push(needLat - latDelta, needLat + latDelta, needLon - lonDelta, needLon + lonDelta);
    }

    const resourcesResult = await dbPool.query(resourceQueryText, resourceParams);
    const resources = resourcesResult.rows;

    const scoredResources = resources.map(resource => {
      let score = 0;
      const resLat = parseFloat(resource.latitude);
      const resLon = parseFloat(resource.longitude);

      if (needLat && needLon && resLat && resLon) {
        const distance = calculateDistance(needLat, needLon, resLat, resLon);
        if (distance < 5) score += 50;
        else if (distance < 20) score += 20;
        else if (distance <= radiusKm) score += 5;
      }

      if (need.required_before_date && isResourceAvailableAt(resource, need.required_before_date)) {
        score += 30;
      }

      if (need.category === resource.category) {
        score += 10;
      }

      return { ...resource, match_score: score };
    });

    scoredResources.sort((a, b) => b.match_score - a.match_score);

    // --- 2. Match Users by Skills and Location ---
    let matchedUsers = [];
    if (need.skill_ids && need.skill_ids.length > 0) {
      let usersBySkillsQuery = `
        SELECT DISTINCT u.id, u.username, u.profile_picture, p.location, p.latitude, p.longitude, p.capacity_status
        FROM skills s
        JOIN LATERAL jsonb_array_elements(s.unlocked_users) AS su ON true
        JOIN users u ON (su->>'user_id')::int = u.id
        LEFT JOIN profiles p ON u.id = p.user_id
        WHERE s.id = ANY($1)
        AND (p.capacity_status IS NULL OR p.capacity_status != 'unavailable')
      `;
      const userParams = [need.skill_ids];
      let userParamIndex = 2;

      if (needLat && needLon) {
        usersBySkillsQuery += ` AND (p.latitude BETWEEN $${userParamIndex++} AND $${userParamIndex++})
                               AND (p.longitude BETWEEN $${userParamIndex++} AND $${userParamIndex++})`;
        userParams.push(needLat - latDelta, needLat + latDelta, needLon - lonDelta, needLon + lonDelta);
      }

      const usersResult = await dbPool.query(usersBySkillsQuery, userParams);

      matchedUsers = usersResult.rows.map(user => {
         let score = 50; // Base score for having at least one skill match
         const userLat = parseFloat(user.latitude);
         const userLon = parseFloat(user.longitude);

         if (needLat && needLon && userLat && userLon) {
           const distance = calculateDistance(needLat, needLon, userLat, userLon);
           if (distance < 10) score += 30;
           else if (distance < 50) score += 10;
         }

         return { ...user, match_score: score };
      });
    }

    matchedUsers.sort((a, b) => b.match_score - a.match_score);

    return {
      resources: scoredResources,
      users: matchedUsers
    };

  } catch (error) {
    console.error(`Error in findMatchesForNeed for needId ${needId}:`, error);
    throw error;
  }
};

const findMatchesForResource = async (resourceId, dbPool) => {
  try {
    const resourceResult = await dbPool.query('SELECT * FROM resources WHERE id = $1', [resourceId]);
    if (resourceResult.rows.length === 0) {
      // throw new Error(`Resource with ID ${resourceId} not found.`);
      console.warn(`Resource with ID ${resourceId} not found.`);
      return [];
    }
    const resource = resourceResult.rows[0];

    // Only match resources that are currently 'available'
    if (resource.status !== 'available') {
      console.log(`Resource ID ${resourceId} is not available (status: ${resource.status}). No matches will be sought.`);
      return [];
    }

    let needQueryText = 'SELECT * FROM needs WHERE category = $1 AND status = $2';
    const queryParams = [resource.category, 'open'];
    
    // Add check for required_before_date

    // Placeholder for geo-spatial filtering (similar to above)
    // const searchRadiusKm = 50;
    // if (resource.latitude != null && resource.longitude != null) {
    //   // ... similar bounding box logic as in findMatchesForNeed ...
    //   // needQueryText += ` AND (latitude BETWEEN ...`;
    // }
    
    const needsResult = await dbPool.query(needQueryText, queryParams);
    const needs = needsResult.rows;

    // Scoring and Ranking for Resource -> Needs
    const scoredNeeds = needs.map(need => {
      let score = 0;

      // Urgency Score
      const urgencyScore = URGENCY_SCORES[need.urgency?.toLowerCase()] || URGENCY_SCORES[need.urgency_level?.toLowerCase()] || 0;
      score += urgencyScore * 10;

      // Proximity
      const needLat = need.location?.latitude || need.latitude;
      const needLon = need.location?.longitude || need.longitude;
      if (needLat && needLon && resource.latitude && resource.longitude) {
        const distance = calculateDistance(needLat, needLon, resource.latitude, resource.longitude);
        if (distance < 5) score += 50;
        else if (distance < 20) score += 20;
      }

      // Availability
      if (need.required_before_date && isResourceAvailableAt(resource, need.required_before_date)) {
        score += 30;
      }

      return { ...need, match_score: score };
    });

    scoredNeeds.sort((a, b) => b.match_score - a.match_score);

    return scoredNeeds;

  } catch (error) {
    console.error(`Error in findMatchesForResource for resourceId ${resourceId}:`, error);
    throw error;
  }
};


export { findMatchesForNeed, findMatchesForResource };
