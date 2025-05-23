// backend/services/resourceExchangeService.js

const initiateExchange = async ({ needId, resourceId, loggedInUserId, notes }, dbPool) => {
  const client = await dbPool.connect(); // For transaction
  try {
    await client.query('BEGIN');

    // 1. Fetch Need and validate
    const needResult = await client.query('SELECT * FROM needs WHERE id = $1 FOR UPDATE', [needId]);
    if (needResult.rows.length === 0) {
      throw new Error('Need not found.');
    }
    const need = needResult.rows[0];
    if (need.status !== 'open') {
      throw new Error(`Need (ID: ${needId}) is no longer open. Current status: ${need.status}.`);
    }

    // 2. Fetch Resource and validate
    const resourceResult = await client.query('SELECT * FROM resources WHERE id = $1 FOR UPDATE', [resourceId]);
    if (resourceResult.rows.length === 0) {
      throw new Error('Resource not found.');
    }
    const resource = resourceResult.rows[0];
    if (resource.status !== 'available') {
      throw new Error(`Resource (ID: ${resourceId}) is no longer available. Current status: ${resource.status}.`);
    }

    // 3. Update Statuses
    const newNeedStatus = 'pending_match'; // Or 'exchange_initiated'
    const newResourceStatus = 'reserved';  // Or 'exchange_initiated'

    await client.query("UPDATE needs SET status = $1 WHERE id = $2", [newNeedStatus, needId]);
    await client.query("UPDATE resources SET status = $1 WHERE id = $2", [newResourceStatus, resourceId]);

    // 4. Generate Coordination Task
    const taskName = `Coordinate Exchange: ${resource.name} for ${need.name}`;
    
    let needOwnerInfo = need.requestor_user_id ? `user ID ${need.requestor_user_id}` : `community ID ${need.requestor_community_id}`;
    if (!need.requestor_user_id && !need.requestor_community_id) {
        needOwnerInfo = "an unspecified requestor";
    }

    let resourceOwnerInfo = resource.owner_user_id ? `user ID ${resource.owner_user_id}` : `community ID ${resource.owner_community_id}`;
     if (!resource.owner_user_id && !resource.owner_community_id) {
        resourceOwnerInfo = "an unspecified owner";
    }
    
    const taskDescription = `Initiate and coordinate the exchange of resource '${resource.name}' (Resource ID: ${resourceId}, listed by ${resourceOwnerInfo}) for the need '${need.name}' (Need ID: ${needId}, requested by ${needOwnerInfo}). Initiated by user ID: ${loggedInUserId}. Exchange Notes: ${notes || 'N/A'}`;
    
    const taskInsertQuery = `
      INSERT INTO tasks (
        name, description, task_type, 
        related_need_id, related_resource_id, 
        creator_id, assigned_to, status, 
        reward_tokens, project_id 
        -- ensure other NOT NULL fields or fields with no DEFAULT in 'tasks' table are handled if any
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id;
    `;
    const taskValues = [
      taskName,                               // name
      taskDescription,                        // description
      'resource_exchange_coordination',       // task_type
      needId,                                 // related_need_id
      resourceId,                             // related_resource_id
      loggedInUserId,                         // creator_id
      null,                                   // assigned_to (can be null or assigned to loggedInUserId or need/resource owner)
      'open',                                 // status
      10,                                     // reward_tokens (default, can be configured)
      null                                    // project_id (not tied to a specific project)
    ];
    const taskResult = await client.query(taskInsertQuery, taskValues);
    const coordinationTaskId = taskResult.rows[0].id;

    // Comment: Future tasks (e.g., pickup confirmation, delivery confirmation, final verification)
    // could be generated here based on resource/need type, or triggered by the completion 
    // of this coordination task via another service or event listener.

    await client.query('COMMIT');
    return { 
      success: true, 
      coordinationTaskId, 
      message: 'Exchange initiated successfully. A coordination task has been created.' 
    };

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in initiateExchange service:', error.message);
    // Re-throw the original error or a new one wrapping it
    // This allows the route handler to decide on the HTTP response based on the error type/message
    throw error; // Or new Error(`Failed to initiate exchange: ${error.message}`);
  } finally {
    client.release();
  }
};

export { initiateExchange }; // For ES6 modules
// module.exports = { initiateExchange }; // For CommonJS, if preferred by project convention
