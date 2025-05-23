// backend/services/impactService.js

const getNeedsFulfilledCount = async (dbPool) => {
  try {
    const result = await dbPool.query("SELECT COUNT(*) AS count FROM needs WHERE status = 'fulfilled'");
    return { needsFulfilled: parseInt(result.rows[0].count, 10) };
  } catch (error) {
    console.error('Error getting needs fulfilled count:', error);
    throw error; // Re-throw to be handled by the calling route/service
  }
};

const getResourcesExchangedCount = async (dbPool) => {
  try {
    const result = await dbPool.query("SELECT COUNT(*) AS count FROM resources WHERE status = 'exchanged'");
    return { resourcesExchanged: parseInt(result.rows[0].count, 10) };
  } catch (error) {
    console.error('Error getting resources exchanged count:', error);
    throw error;
  }
};

const getCommunityImpactStats = async (dbPool, communityId) => {
  if (!communityId) {
    throw new Error('Community ID is required to get community impact stats.');
  }
  try {
    const needsResult = await dbPool.query(
      "SELECT COUNT(*) AS count FROM needs WHERE requestor_community_id = $1 AND status = 'fulfilled'",
      [communityId]
    );
    const resourcesResult = await dbPool.query(
      "SELECT COUNT(*) AS count FROM resources WHERE owner_community_id = $1 AND status = 'exchanged'",
      [communityId]
    );
    return {
      communityNeedsFulfilled: parseInt(needsResult.rows[0].count, 10),
      communityResourcesExchanged: parseInt(resourcesResult.rows[0].count, 10),
    };
  } catch (error) {
    console.error(`Error getting impact stats for community ${communityId}:`, error);
    throw error;
  }
};

const getOverallPlatformImpact = async (dbPool) => {
  try {
    const needsFulfilledData = await getNeedsFulfilledCount(dbPool);
    const resourcesExchangedData = await getResourcesExchangedCount(dbPool);
    
    // Add more stats here in the future
    // Example: Fetch count of unique users involved in 'completed' or 'verified' exchange tasks
    // const activeUsersResult = await dbPool.query(
    //   `SELECT COUNT(DISTINCT creator_id) AS count 
    //    FROM tasks 
    //    WHERE task_type = 'resource_exchange_coordination' AND status = 'completed'` 
    //    // Assuming 'completed' status means successful exchange
    // );
    // const activeUsersInExchanges = activeUsersResult.rows.length > 0 ? parseInt(activeUsersResult.rows[0].count, 10) : 0;

    return {
      ...needsFulfilledData,
      ...resourcesExchangedData,
      // Placeholder for future:
      // resourcesSavedFromWaste: 0, // Conceptual: This would require more specific data points.
      // activeUsersInExchanges: activeUsersInExchanges, // Example conceptual addition
    };
  } catch (error) {
    console.error('Error getting overall platform impact:', error);
    throw error;
  }
};

// Comments for future enhancements:
// - resources_saved_from_waste: This metric would likely require more detailed resource categorization
//   (e.g., perishables, items diverted from landfill) or user input upon exchange completion
//   (e.g., a checkbox "This item would have been wasted").
// - community_interdependence_networks: Analyzing the flow of resources/services between
//   different users and communities to map dependencies and mutual support. This might involve
//   graph database techniques or complex SQL queries on transaction/exchange logs.
// - total_tokens_exchanged_in_system: Summing `reward_tokens` from completed exchange-related tasks
//   or from a dedicated exchange log table could provide insights into economic activity.

export {
  getNeedsFulfilledCount,
  getResourcesExchangedCount,
  getCommunityImpactStats,
  getOverallPlatformImpact,
};
