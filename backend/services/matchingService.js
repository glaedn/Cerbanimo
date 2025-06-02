// backend/services/matchingService.js

const URGENCY_SCORES = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

// Placeholder for future Haversine distance calculation
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) {
    return Infinity; // Or handle as per specific requirements for missing coords
  }
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    0.5 - Math.cos(dLat) / 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    (1 - Math.cos(dLon)) / 2;
  return R * 2 * Math.asin(Math.sqrt(a)); // Distance in km
};

const findMatchesForNeed = async (needId, dbPool, searchRadiusKm = 50) => {
  try {
    // Fetch the need details including new fields
    const needQuery = `
      SELECT
        n.*,
        n.tags AS need_tags,
        n.constraints AS need_constraints,
        n.duration_type AS need_duration_type,
        n.duration_details AS need_duration_details,
        n.latitude AS need_latitude,
        n.longitude AS need_longitude
      FROM needs n
      WHERE n.id = $1
    `;
    const needResult = await dbPool.query(needQuery, [needId]);

    if (needResult.rows.length === 0) {
      console.warn(`Need with ID ${needId} not found.`);
      return [];
    }
    const need = needResult.rows[0];

    if (need.status !== 'open') {
      console.log(`Need ID ${needId} is not open (status: ${need.status}). No matches will be sought.`);
      return [];
    }

    let paramIndex = 1;
    const queryParams = [];

    // Base resource query
    let resourceQueryText = `
      SELECT
        r.*,
        r.tags AS resource_tags,
        r.constraints AS resource_constraints,
        r.duration_type AS resource_duration_type,
        r.duration_details AS resource_duration_details,
        r.latitude AS resource_latitude,
        r.longitude AS resource_longitude,
        COALESCE(u.verified_status, c.verified_status, FALSE) AS owner_verified_status
      FROM resources r
      LEFT JOIN users u ON r.owner_user_id = u.id
      LEFT JOIN communities c ON r.owner_community_id = c.id
      WHERE r.category = $${paramIndex++} AND r.status = 'available'
    `;
    queryParams.push(need.category);

    // Add check for availability window
    resourceQueryText += ' AND (r.availability_window_end IS NULL OR r.availability_window_end >= NOW())';

    // Filter by tags if the need has tags
    if (need.need_tags && need.need_tags.length > 0) {
      resourceQueryText += ` AND r.tags && $${paramIndex++}`;
      queryParams.push(need.need_tags);
    }

    const resourcesResult = await dbPool.query(resourceQueryText, queryParams);
    
    // If more complex JS-based filtering (e.g., Haversine) were needed after a broader SQL query:

    const C1 = 10; // Tag match weight
    const C2 = 0.1; // Distance weight
    const C3 = 20; // Verified status weight

    let matchedResources = resourcesResult.rows.map(resource => {
      let score = 100; // Base score
      let distanceKm = Infinity;

      // Location scoring
      if (need.need_latitude != null && need.need_longitude != null && resource.resource_latitude != null && resource.resource_longitude != null) {
        distanceKm = calculateDistance(need.need_latitude, need.need_longitude, resource.resource_latitude, resource.resource_longitude);
        if (distanceKm > searchRadiusKm) {
          return null; // Filter out if beyond search radius
        }
        score -= distanceKm * C2;
      }

      // Tag scoring
      if (need.need_tags && need.need_tags.length > 0 && resource.resource_tags && resource.resource_tags.length > 0) {
        const overlappingTags = need.need_tags.filter(tag => resource.resource_tags.includes(tag));
        score += overlappingTags.length * C1;
      }

      // Constraints filtering (simple example)
      if (need.need_constraints && need.need_constraints.approval_required === true) {
        if (!resource.resource_constraints || resource.resource_constraints.provides_approval !== true) {
          // Down-weight or filter. For now, let's significantly reduce score.
          // Alternatively, return null to filter out.
          score -= 50; // Penalty for not meeting a "true" constraint
        }
      }
      // Add more constraint checks as needed based on defined conventions

      // Duration filtering/scoring
      if (need.need_duration_type === 'one_time' && resource.resource_duration_type === 'one_time') {
        score += 5; // Small bonus for matching one_time
      }
      // Example: Check day compatibility if need has specific days
      if (need.need_duration_details && need.need_duration_details.days && need.need_duration_details.days.length > 0) {
        // This is a simplified check. Real duration matching can be complex.
        // For example, if resource has duration_details like { type: 'weekly', days: ['Mon', 'Wed'] }
        // or uses availability_window_start/end for specific event dates.
        // Here, we might check if there's any overlap or if the resource's availability aligns.
        // This part needs more specific rules based on how duration_details and availability_window are used.
        // For now, a placeholder:
        if (resource.resource_duration_details && resource.resource_duration_details.days) {
            const needDays = new Set(need.need_duration_details.days);
            const resourceDays = new Set(resource.resource_duration_details.days);
            const intersection = new Set([...needDays].filter(x => resourceDays.has(x)));
            if (intersection.size === 0 && need.need_duration_type !== 'ongoing' && resource.resource_duration_type !== 'ongoing') {
                // If no overlapping days and neither are ongoing, penalize or filter
                score -= 30; // Penalty for day mismatch
            }
        }
      }

      // Verified status bonus
      if (resource.owner_verified_status === true) {
        score += C3;
      }

      return { ...resource, score, distanceKm };
    }).filter(resource => resource !== null && resource.score > 0); // Filter out nulls and those with non-positive scores

    // Sort resources:
    // 1. By composite score (descending)
    // 2. Then by availability_window_end (ascending, earlier is better)
    matchedResources.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      const dateA = a.availability_window_end ? new Date(a.availability_window_end).getTime() : Infinity;
      const dateB = b.availability_window_end ? new Date(b.availability_window_end).getTime() : Infinity;

      if (dateA === Infinity && dateB === Infinity) return 0;
      if (dateA === Infinity) return 1;
      if (dateB === Infinity) return -1;
      return dateA - dateB;
    });

    return matchedResources;

  } catch (error) {
    console.error(`Error in findMatchesForNeed for needId ${needId}:`, error);
    throw error; // Re-throw to be handled by the route or calling service
  }
};

const findMatchesForResource = async (resourceId, dbPool, searchRadiusKm = 50) => {
  try {
    const resourceQuery = `
      SELECT
        r.*,
        r.tags AS resource_tags,
        r.constraints AS resource_constraints,
        r.duration_type AS resource_duration_type,
        r.duration_details AS resource_duration_details,
        r.latitude AS resource_latitude,
        r.longitude AS resource_longitude
      FROM resources r
      WHERE r.id = $1
    `;
    const resourceResult = await dbPool.query(resourceQuery, [resourceId]);

    if (resourceResult.rows.length === 0) {
      console.warn(`Resource with ID ${resourceId} not found.`);
      return [];
    }
    const resource = resourceResult.rows[0];

    if (resource.status !== 'available') {
      console.log(`Resource ID ${resourceId} is not available (status: ${resource.status}). No matches will be sought.`);
      return [];
    }

    let paramIndex = 1;
    const queryParams = [];

    let needQueryText = `
      SELECT
        n.*,
        n.tags AS need_tags,
        n.constraints AS need_constraints,
        n.duration_type AS need_duration_type,
        n.duration_details AS need_duration_details,
        n.latitude AS need_latitude,
        n.longitude AS need_longitude,
        COALESCE(u.verified_status, c.verified_status, FALSE) AS requestor_verified_status
      FROM needs n
      LEFT JOIN users u ON n.requestor_user_id = u.id
      LEFT JOIN communities c ON n.requestor_community_id = c.id
      WHERE n.category = $${paramIndex++} AND n.status = 'open'
    `;
    queryParams.push(resource.category);
    
    // Add check for required_before_date (needs must not be past their required date)
    needQueryText += ' AND (n.required_before_date IS NULL OR n.required_before_date >= NOW())';

    if (resource.resource_tags && resource.resource_tags.length > 0) {
      needQueryText += ` AND n.tags && $${paramIndex++}`;
      queryParams.push(resource.resource_tags);
    }
    
    const needsResult = await dbPool.query(needQueryText, queryParams);
    
    const C1 = 10; // Tag match weight
    const C2 = 0.1; // Distance weight
    const C3 = 20; // Verified status weight
    const C4 = 5; // Urgency multiplier

    let matchedNeeds = needsResult.rows.map(need => {
      let score = 100; // Base score
      let distanceKm = Infinity;

      // Location scoring
      if (resource.resource_latitude != null && resource.resource_longitude != null && need.need_latitude != null && need.need_longitude != null) {
        distanceKm = calculateDistance(resource.resource_latitude, resource.resource_longitude, need.need_latitude, need.need_longitude);
        if (distanceKm > searchRadiusKm) {
          return null; // Filter out if beyond search radius
        }
        score -= distanceKm * C2;
      }

      // Tag scoring
      if (resource.resource_tags && resource.resource_tags.length > 0 && need.need_tags && need.need_tags.length > 0) {
        const overlappingTags = resource.resource_tags.filter(tag => need.need_tags.includes(tag));
        score += overlappingTags.length * C1;
      }

      // Constraints filtering (simple example)
      // Example: if resource.constraints.requires_setup = true, need must be able to accommodate
      if (resource.resource_constraints && resource.resource_constraints.requires_setup === true) {
        if (need.need_constraints && need.need_constraints.cannot_accommodate_setup === true) {
           score -= 50; // Penalize if need cannot accommodate resource's requirement
        }
      }

      // Duration matching
      if (resource.resource_duration_type === 'one_time' && need.need_duration_type === 'one_time') {
        score += 5; // Bonus for matching one_time
      }
      // Simplified duration details matching (similar to findMatchesForNeed)
      if (resource.resource_duration_details && resource.resource_duration_details.days && resource.resource_duration_details.days.length > 0) {
        if (need.need_duration_details && need.need_duration_details.days) {
            const resourceDays = new Set(resource.resource_duration_details.days);
            const needDays = new Set(need.need_duration_details.days);
            const intersection = new Set([...resourceDays].filter(x => needDays.has(x)));
            if (intersection.size === 0 && resource.resource_duration_type !== 'ongoing' && need.need_duration_type !== 'ongoing') {
                score -= 30; // Penalty for day mismatch
            }
        }
      }

      // Verified status bonus
      if (need.requestor_verified_status === true) {
        score += C3;
      }

      // Urgency score
      score += (URGENCY_SCORES[need.urgency?.toLowerCase()] || 0) * C4;

      return { ...need, score, distanceKm };
    }).filter(need => need !== null && need.score > 0);


    // Sort needs:
    // 1. By composite score (descending)
    // 2. By urgency (descending)
    // 3. By required_before_date (ascending)
    matchedNeeds.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      const urgencyA = URGENCY_SCORES[a.urgency?.toLowerCase()] || 0;
      const urgencyB = URGENCY_SCORES[b.urgency?.toLowerCase()] || 0;
      if (urgencyB !== urgencyA) {
        return urgencyB - urgencyA;
      }
      const dateA = a.required_before_date ? new Date(a.required_before_date).getTime() : Infinity;
      const dateB = b.required_before_date ? new Date(b.required_before_date).getTime() : Infinity;
      return dateA - dateB;
    });

    return matchedNeeds;

  } catch (error) {
    console.error(`Error in findMatchesForResource for resourceId ${resourceId}:`, error);
    throw error;
  }
};


export { findMatchesForNeed, findMatchesForResource };
