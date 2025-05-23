// backend/services/matchingService.js

const URGENCY_SCORES = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

// Placeholder for future Haversine distance calculation
// const calculateDistance = (lat1, lon1, lat2, lon2) => {
//   // Haversine formula implementation:
//   // const R = 6371; // Radius of the earth in km
//   // const dLat = (lat2 - lat1) * Math.PI / 180;
//   // const dLon = (lon2 - lon1) * Math.PI / 180;
//   // const a =
//   //   0.5 - Math.cos(dLat) / 2 +
//   //   Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
//   //   (1 - Math.cos(dLon)) / 2;
//   // return R * 2 * Math.asin(Math.sqrt(a)); // Distance in km
//   return 0; // Placeholder
// };

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
    let paramIndex = 3; // Start after category and status

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
    
    // If more complex JS-based filtering (e.g., Haversine) were needed after a broader SQL query:
    // const matchedResources = resourcesResult.rows.filter(resource => {
    //   if (need.latitude != null && need.longitude != null && resource.latitude != null && resource.longitude != null) {
    //     // const distance = calculateDistance(need.latitude, need.longitude, resource.latitude, resource.longitude);
    //     // return distance < searchRadiusKm; 
    //     return true; // Placeholder if SQL did not filter by distance
    //   }
    //   // If location data is missing on either, decide if it's a match by default or not.
    //   // For now, if SQL didn't filter, and we don't filter here, it's a match based on category/status.
    //   return true; 
    // });
    // return matchedResources;

    // Sort resources: prioritize those expiring sooner.
    // Resources with null availability_window_end are considered "available indefinitely" and come after those with specific end dates.
    resourcesResult.rows.sort((a, b) => {
      const dateA = a.availability_window_end ? new Date(a.availability_window_end).getTime() : Infinity;
      const dateB = b.availability_window_end ? new Date(b.availability_window_end).getTime() : Infinity;

      if (dateA === Infinity && dateB === Infinity) {
        return 0; // Keep original order if both are null
      }
      if (dateA === Infinity) {
        return 1; // a (null) comes after b (not null)
      }
      if (dateB === Infinity) {
        return -1; // b (null) comes after a (not null)
      }
      return dateA - dateB; // Ascending sort by date (earlier is higher priority)
    });

    return resourcesResult.rows;

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
    let paramIndex = 3;
    
    // Add check for required_before_date
    needQueryText += ' AND (required_before_date IS NULL OR required_before_date >= NOW())';

    // Placeholder for geo-spatial filtering (similar to above)
    // const searchRadiusKm = 50;
    // if (resource.latitude != null && resource.longitude != null) {
    //   // ... similar bounding box logic as in findMatchesForNeed ...
    //   // needQueryText += ` AND (latitude BETWEEN ...`;
    // }
    
    const needsResult = await dbPool.query(needQueryText, queryParams);
    
    // Similar JS filtering placeholder as above if needed
    // return needsResult.rows.filter(need => { ... });

    // Sort needs:
    // 1. By urgency (descending: critical > high > medium > low)
    // 2. By required_before_date (ascending: earlier date is higher priority)
    needsResult.rows.sort((a, b) => {
      const urgencyA = URGENCY_SCORES[a.urgency?.toLowerCase()] || 0;
      const urgencyB = URGENCY_SCORES[b.urgency?.toLowerCase()] || 0;
      if (urgencyB !== urgencyA) {
        return urgencyB - urgencyA; // Higher urgency score first
      }

      // If urgency is the same, sort by required_before_date
      // Needs with null required_before_date are considered less urgent (come after those with specific dates)
      const dateA = a.required_before_date ? new Date(a.required_before_date).getTime() : Infinity;
      const dateB = b.required_before_date ? new Date(b.required_before_date).getTime() : Infinity;
      
      return dateA - dateB; // Ascending sort by date (earlier is higher priority)
    });

    return needsResult.rows;

  } catch (error) {
    console.error(`Error in findMatchesForResource for resourceId ${resourceId}:`, error);
    throw error;
  }
};

module.exports = { // Using CommonJS export for Node.js backend services
  findMatchesForNeed,
  findMatchesForResource,
};
