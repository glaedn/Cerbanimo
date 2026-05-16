// backend/services/matchingService.js

const URGENCY_SCORES = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
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
    const needResult = await dbPool.query('SELECT *, ST_X(location_point::geometry) as lon, ST_Y(location_point::geometry) as lat FROM needs WHERE id = $1', [needId]);
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

    const needLat = parseFloat(need.lat || need.location?.latitude || need.latitude);
    const needLon = parseFloat(need.lon || need.location?.longitude || need.longitude);
    const hasLocation = !isNaN(needLat) && !isNaN(needLon);

    // --- 1. Match Resources ---
    let resourceQueryText = `
      SELECT *,
      ${hasLocation ? 'ST_Distance(location_point, ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography) / 1000 as distance_km' : 'NULL as distance_km'}
      FROM resources
      WHERE category = $1 AND status = $2
      AND (availability_window_end IS NULL OR availability_window_end >= NOW())
    `;
    const resourceParams = [need.category, 'available'];

    if (hasLocation) {
      resourceQueryText += ' AND ST_DWithin(location_point, ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography, $5)';
      resourceParams.push(needLon, needLat, radiusKm * 1000);
    }

    const resourcesResult = await dbPool.query(resourceQueryText, resourceParams);
    let resources = resourcesResult.rows;

    // --- 1.1 Federation Resources (if escalating) ---
    if (need.status === 'escalating' && need.requestor_community_id) {
      const federationResourcesResult = await dbPool.query(`
        SELECT r.*,
        ${hasLocation ? 'ST_Distance(r.location_point, ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography) / 1000 as distance_km' : 'NULL as distance_km'}
        FROM resources r
        JOIN federation_treaties ft ON (ft.community_a = $1 OR ft.community_b = $1)
        JOIN communities c ON (c.id = ft.community_a OR c.id = ft.community_b)
        WHERE (r.owner_community_id = c.id AND c.id != $1)
        AND ft.status = 'active'
        AND r.category = $2
        AND r.status = 'available'
        ${hasLocation ? 'AND ST_DWithin(r.location_point, ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography, $5)' : ''}
      `, hasLocation ? [need.requestor_community_id, need.category, needLon, needLat, radiusKm * 1000] : [need.requestor_community_id, need.category]);

      resources = [...resources, ...federationResourcesResult.rows];
    }

    const scoredResources = resources.map(resource => {
      let score = 0;
      const distance = resource.distance_km;

      if (distance !== null) {
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
        SELECT DISTINCT u.id, u.username, u.profile_picture, u.capacity_status,
        ${hasLocation ? 'ST_Distance(u.location_point, ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography) / 1000 as distance_km' : 'NULL as distance_km'}
        FROM skills s
        JOIN LATERAL jsonb_array_elements(s.unlocked_users) AS su ON true
        JOIN users u ON (su->>'user_id')::int = u.id
        WHERE s.id = ANY($1)
        AND (u.capacity_status IS NULL OR u.capacity_status != 'unavailable')
      `;
      const userParams = [need.skill_ids];
      if (hasLocation) {
        usersBySkillsQuery += ' AND ST_DWithin(u.location_point, ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography, $4)';
        userParams.push(needLon, needLat, radiusKm * 1000);
      }

      const usersResult = await dbPool.query(usersBySkillsQuery, userParams);

      matchedUsers = usersResult.rows.map(user => {
         let score = 50; // Base score for having at least one skill match
         const distance = user.distance_km;

         if (distance !== null) {
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

const findMatchesForResource = async (resourceId, dbPool, radiusKm = 50) => {
  try {
    const resourceResult = await dbPool.query('SELECT *, ST_X(location_point::geometry) as lon, ST_Y(location_point::geometry) as lat FROM resources WHERE id = $1', [resourceId]);
    if (resourceResult.rows.length === 0) {
      console.warn(`Resource with ID ${resourceId} not found.`);
      return [];
    }
    const resource = resourceResult.rows[0];

    // Only match resources that are currently 'available'
    if (resource.status !== 'available') {
      console.log(`Resource ID ${resourceId} is not available (status: ${resource.status}). No matches will be sought.`);
      return [];
    }

    const resLat = parseFloat(resource.lat || resource.latitude);
    const resLon = parseFloat(resource.lon || resource.longitude);
    const hasLocation = !isNaN(resLat) && !isNaN(resLon);

    let needQueryText = `
      SELECT *,
      ${hasLocation ? 'ST_Distance(location_point, ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography) / 1000 as distance_km' : 'NULL as distance_km'}
      FROM needs
      WHERE category = $1 AND status = $2
    `;
    const queryParams = [resource.category, 'open'];
    
    if (hasLocation) {
      needQueryText += ' AND ST_DWithin(location_point, ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography, $5)';
      queryParams.push(resLon, resLat, radiusKm * 1000);
    }
    
    const needsResult = await dbPool.query(needQueryText, queryParams);
    const needs = needsResult.rows;

    // Scoring and Ranking for Resource -> Needs
    const scoredNeeds = needs.map(need => {
      let score = 0;

      // Urgency Score
      const urgencyScore = URGENCY_SCORES[need.urgency?.toLowerCase()] || URGENCY_SCORES[need.urgency_level?.toLowerCase()] || 0;
      score += urgencyScore * 10;

      // Proximity
      const distance = need.distance_km;
      if (distance !== null) {
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
