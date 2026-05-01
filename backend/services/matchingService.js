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

const findMatchesForNeed = async (needId, dbPool) => {
  try {
    const needResult = await dbPool.query('SELECT * FROM needs WHERE id = $1', [needId]);
    if (needResult.rows.length === 0) {
      // Option 1: Throw an error to be caught by API layer (e.g., for a 404 response)
      // throw new Error(`Need with ID ${needId} not found.`);
      // Option 2: Return empty array if not finding the need isn't an "error" for matching
      console.warn(`Need with ID ${needId} not found.`);
      return [];
    }
    const need = needResult.rows[0];

    // Only match needs that are currently 'open'
    if (need.status !== 'open') {
      console.log(`Need ID ${needId} is not open (status: ${need.status}). No matches will be sought.`);
      return [];
    }

    // Basic query by category and availability status
    let resourceQueryText = 'SELECT * FROM resources WHERE category = $1 AND status = $2';
    const queryParams = [need.category, 'available'];

    // Add check for availability window
    resourceQueryText += ' AND (availability_window_end IS NULL OR availability_window_end >= NOW())';
    
    // Placeholder for geo-spatial filtering (bounding box example)
    // This is a simplified approach. PostGIS would be more accurate and efficient.
    // const searchRadiusKm = 50; // Example search radius
    // if (need.latitude != null && need.longitude != null) {
    //   // Approximate degrees per km (varies with latitude)
    //   const latDegreesPerKm = 1 / 111; 
    //   const lonDegreesPerKm = 1 / (111 * Math.cos(need.latitude * Math.PI / 180));
          
    //   const latRadius = searchRadiusKm * latDegreesPerKm;
    //   const lonRadius = searchRadiusKm * lonDegreesPerKm;
          
    //   resourceQueryText += ` AND (latitude BETWEEN $${paramIndex++} AND $${paramIndex++})`;
    //   queryParams.push(need.latitude - latRadius, need.latitude + latRadius);
          
    //   resourceQueryText += ` AND (longitude BETWEEN $${paramIndex++} AND $${paramIndex++})`;
    //   queryParams.push(need.longitude - lonRadius, need.longitude + lonRadius);
    //   resourceQueryText += ' ORDER BY ST_Distance(ST_MakePoint(longitude, latitude), ST_MakePoint($${paramIndex++}, $${paramIndex++})) ASC'; // Requires PostGIS
    //   queryParams.push(need.longitude, need.latitude)
    // }

    const resourcesResult = await dbPool.query(resourceQueryText, queryParams);
    let resources = resourcesResult.rows;

    // Scoring and Ranking
    const scoredResources = resources.map(resource => {
      let score = 0;

      // Proximity Score (if available)
      const needLat = need.location?.latitude || need.latitude;
      const needLon = need.location?.longitude || need.longitude;
      const resLat = resource.latitude;
      const resLon = resource.longitude;

      if (needLat && needLon && resLat && resLon) {
        const distance = calculateDistance(needLat, needLon, resLat, resLon);
        if (distance < 5) score += 50;
        else if (distance < 20) score += 20;
        else if (distance < 50) score += 5;
      }

      // Availability Score
      if (need.required_before_date && isResourceAvailableAt(resource, need.required_before_date)) {
        score += 30;
      }

      // Resource Type Match (Example: if need requires specific type)
      // This can be expanded based on more complex requirement definitions
      if (need.category === resource.category) {
        score += 10;
      }

      return { ...resource, match_score: score };
    });

    scoredResources.sort((a, b) => b.match_score - a.match_score);

    return scoredResources;

  } catch (error) {
    console.error(`Error in findMatchesForNeed for needId ${needId}:`, error);
    throw error; // Re-throw to be handled by the route or calling service
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
