import express from 'express';
import pool from '../db.js';
import authenticate from '../middlewares/authenticate.js';

const router = express.Router();

// POST /transactions - Initiate a new transaction
router.post('/', authenticate, async (req, res) => {
  const { need_id, resource_id, initial_message } = req.body;
  const initiator_user_id = req.user.id;

  if (!need_id || !resource_id) {
    return res.status(400).json({ error: 'need_id and resource_id are required.' });
  }

  try {
    // Fetch need details to get requestor (receiver)
    const needRes = await pool.query('SELECT requestor_user_id, requestor_community_id FROM needs WHERE id = $1', [need_id]);
    if (needRes.rows.length === 0) {
      return res.status(404).json({ error: 'Need not found.' });
    }
    const { requestor_user_id: receiver_user_id, requestor_community_id: receiver_community_id } = needRes.rows[0];

    // Fetch resource details to get owner (provider)
    const resourceRes = await pool.query('SELECT owner_user_id, owner_community_id FROM resources WHERE id = $1', [resource_id]);
    if (resourceRes.rows.length === 0) {
      return res.status(404).json({ error: 'Resource not found.' });
    }
    const { owner_user_id: provider_user_id, owner_community_id: provider_community_id } = resourceRes.rows[0];

    // Basic validation: ensure provider and receiver are present
    if ((!provider_user_id && !provider_community_id) || (!receiver_user_id && !receiver_community_id)) {
        return res.status(400).json({ error: 'Provider or Receiver information is missing from the need/resource.' });
    }

    // Determine initial status - for now, default 'pending_provider_acceptance' is used from schema
    // More complex logic could be added here based on initiator_user_id if needed.
    // e.g. if (initiator_user_id === provider_user_id || isUserInCommunity(initiator_user_id, provider_community_id))
    // then status = 'pending_receiver_acceptance' else status = 'pending_provider_acceptance'

    const result = await pool.query(
      `INSERT INTO resource_transactions (need_id, resource_id, provider_user_id, provider_community_id, receiver_user_id, receiver_community_id, message)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        need_id, resource_id,
        provider_user_id, provider_community_id,
        receiver_user_id, receiver_community_id,
        initial_message
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error initiating transaction:', err);
    if (err.code === '23503') { // Foreign key violation
        return res.status(400).json({ error: 'Invalid need_id or resource_id, or related user/community does not exist.' });
    }
    if (err.constraint) { // Check constraint violation (e.g. check_either_provider)
        return res.status(400).json({ error: `Failed to meet transaction constraints: ${err.detail || err.message}`});
    }
    res.status(500).json({ error: 'Failed to initiate transaction' });
  }
});

// PUT /transactions/:transactionId/status - Update transaction status
router.put('/:transactionId/status', authenticate, async (req, res) => {
  const { transactionId } = req.params;
  const { status, message } = req.body;
  const currentUserId = req.user.id;

  if (!status) {
    return res.status(400).json({ error: 'Status is required.' });
  }

  // Define valid statuses and simple transition rules
  const validStatuses = [
    'pending_provider_acceptance', 'pending_receiver_acceptance',
    'accepted', 'fulfilled',
    'cancelled_by_provider', 'cancelled_by_receiver',
    'declined_by_provider', 'declined_by_receiver'
  ];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status value.' });
  }

  try {
    const transactionRes = await pool.query('SELECT * FROM resource_transactions WHERE id = $1', [transactionId]);
    if (transactionRes.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found.' });
    }
    const transaction = transactionRes.rows[0];

    // Authorization: Only provider or receiver can update (simplified - needs community admin check too)
    // TODO: Implement more robust authorization (e.g., user is admin of provider_community_id or receiver_community_id)
    const isProvider = transaction.provider_user_id === currentUserId;
    const isReceiver = transaction.receiver_user_id === currentUserId;

    if (!isProvider && !isReceiver && !req.user.isAdmin) { // Assuming isAdmin flag for admin override
      return res.status(403).json({ error: 'User not authorized to update this transaction.' });
    }

    // Basic status transition checks
    const nonRevertibleStatuses = ['fulfilled', 'cancelled_by_provider', 'cancelled_by_receiver', 'declined_by_provider', 'declined_by_receiver'];
    if (nonRevertibleStatuses.includes(transaction.status)) {
      return res.status(400).json({ error: `Cannot change status from '${transaction.status}'.` });
    }

    // Specific role-based status updates (examples)
    if (status === 'cancelled_by_provider' && !isProvider && !req.user.isAdmin) return res.status(403).json({error: 'Only provider can set this status.'});
    if (status === 'cancelled_by_receiver' && !isReceiver && !req.user.isAdmin) return res.status(403).json({error: 'Only receiver can set this status.'});
    // Add more rules as needed, e.g. who can mark as 'fulfilled'

    const updateFields = ['status = $1'];
    const values = [status];
    let paramIndex = 2;

    if (message !== undefined) {
      updateFields.push(`message = $${paramIndex++}`);
      values.push(message);
    }
    values.push(transactionId);

    const updateQuery = `UPDATE resource_transactions SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await pool.query(updateQuery, values);
    const updatedTransaction = result.rows[0];

    if (updatedTransaction.status === 'fulfilled') {
      try {
        // Fetch additional details for names
        const detailsQuery = `
          SELECT
            n.name AS need_name,
            r.name AS resource_name,
            COALESCE(pu.username, pcomm.name) AS provider_name,
            COALESCE(ru.username, rcomm.name) AS receiver_name,
            n.category AS need_category,
            r.category AS resource_category
          FROM resource_transactions t
          LEFT JOIN needs n ON t.need_id = n.id
          LEFT JOIN resources r ON t.resource_id = r.id
          LEFT JOIN users pu ON t.provider_user_id = pu.id
          LEFT JOIN communities pcomm ON t.provider_community_id = pcomm.id
          LEFT JOIN users ru ON t.receiver_user_id = ru.id
          LEFT JOIN communities rcomm ON t.receiver_community_id = rcomm.id
          WHERE t.id = $1
        `;
        const detailsRes = await pool.query(detailsQuery, [updatedTransaction.id]);
        const details = detailsRes.rows[0] || {};

        const resourceName = details.resource_name || 'Unknown Resource';
        const needName = details.need_name || 'Unknown Need';
        const providerName = details.provider_name || 'Unknown Provider';
        const receiverName = details.receiver_name || 'Unknown Receiver';

        // 1. Create Task
        const taskName = `Fulfilled: ${resourceName} for ${needName}`;
        const taskDescription = `Resource '${resourceName}' (from ${providerName}) was provided to ${receiverName} for their need '${needName}'.`;

        let creatorId = updatedTransaction.receiver_user_id;
        if (!creatorId) creatorId = updatedTransaction.provider_user_id;
        // If both are null (community only transaction), creator_id might be null if allowed by tasks table schema.
        // Assuming tasks.creator_id is nullable or a system user ID can be used.

        const assignedUserIds = [updatedTransaction.provider_user_id, updatedTransaction.receiver_user_id].filter(id => id != null);

        const taskInsertQuery = `
          INSERT INTO tasks (name, description, task_type, related_resource_id, related_need_id, creator_id, assigned_user_ids, status, reward_tokens, active_ind, submitted, submitted_at)
          VALUES ($1, $2, 'resource_exchange', $3, $4, $5, $6, 'completed', 0, false, true, CURRENT_TIMESTAMP)
          RETURNING id`;
        const taskInsertRes = await pool.query(taskInsertQuery, [
          taskName, taskDescription, updatedTransaction.resource_id, updatedTransaction.need_id, creatorId, assignedUserIds
        ]);
        const newTaskId = taskInsertRes.rows[0].id;

        // 2. Create Story Node for Provider
        if (updatedTransaction.provider_user_id) {
          const providerReflection = `Successfully provided resource '${resourceName}' to ${receiverName} for their need '${needName}'.`;
          const providerTags = ['resource_provided', 'fulfillment', 'resource_exchange'];
          if (details.resource_category) providerTags.push(details.resource_category);

          await pool.query(
            `INSERT INTO story_nodes (task_id, user_id, reflection, tags) VALUES ($1, $2, $3, $4)`,
            [newTaskId, updatedTransaction.provider_user_id, providerReflection, providerTags]
          );
        }

        // 3. Create Story Node for Receiver
        if (updatedTransaction.receiver_user_id) {
          const receiverReflection = `Received resource '${resourceName}' from ${providerName} for my need '${needName}'.`;
          const receiverTags = ['resource_received', 'fulfillment', 'resource_exchange'];
          if (details.need_category) receiverTags.push(details.need_category);

          await pool.query(
            `INSERT INTO story_nodes (task_id, user_id, reflection, tags) VALUES ($1, $2, $3, $4)`,
            [newTaskId, updatedTransaction.receiver_user_id, receiverReflection, receiverTags]
          );
        }
        console.log(`Successfully created task and story nodes for fulfilled transaction ${updatedTransaction.id}`);
      } catch (postFulfillmentError) {
        console.error(`Error during post-fulfillment actions for transaction ${updatedTransaction.id}:`, postFulfillmentError);
        // Do not let this error fail the main response, as transaction status update was successful.
      }
    }

    res.json(updatedTransaction);
  } catch (err) {
    console.error('Error updating transaction status:', err);
    res.status(500).json({ error: 'Failed to update transaction status' });
  }
});

// GET /transactions/user - Get all transactions for the current user
router.get('/user', authenticate, async (req, res) => {
  const currentUserId = req.user.id;
  try {
    // This query should ideally also check community involvement.
    // For now, it checks direct user involvement.
    // TODO: Expand to check if user is part of provider_community_id or receiver_community_id
    const result = await pool.query(
      `SELECT rt.*,
              n.name as need_name,
              r.name as resource_name,
              pu.username as provider_username,
              cu.username as receiver_username
       FROM resource_transactions rt
       LEFT JOIN needs n ON rt.need_id = n.id
       LEFT JOIN resources r ON rt.resource_id = r.id
       LEFT JOIN users pu ON rt.provider_user_id = pu.id
       LEFT JOIN users cu ON rt.receiver_user_id = cu.id
       WHERE rt.provider_user_id = $1 OR rt.receiver_user_id = $1
       ORDER BY rt.updated_at DESC`,
      [currentUserId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching user's transactions:", err);
    res.status(500).json({ error: "Failed to fetch user's transactions" });
  }
});

// GET /transactions/:transactionId - Get details of a specific transaction
router.get('/:transactionId', authenticate, async (req, res) => {
  const { transactionId } = req.params;
  const currentUserId = req.user.id;

  try {
    const result = await pool.query(
      `SELECT rt.*,
              n.name as need_name,
              r.name as resource_name,
              pu.username as provider_username,
              cu.username as receiver_username,
              prov_comm.name as provider_community_name,
              rec_comm.name as receiver_community_name
       FROM resource_transactions rt
       LEFT JOIN needs n ON rt.need_id = n.id
       LEFT JOIN resources r ON rt.resource_id = r.id
       LEFT JOIN users pu ON rt.provider_user_id = pu.id
       LEFT JOIN users cu ON rt.receiver_user_id = cu.id
       LEFT JOIN communities prov_comm ON rt.provider_community_id = prov_comm.id
       LEFT JOIN communities rec_comm ON rt.receiver_community_id = rec_comm.id
       WHERE rt.id = $1`,
       [transactionId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found.' });
    }
    const transaction = result.rows[0];

    // Authorization check (simplified)
    // TODO: Implement more robust authorization (e.g., user is admin of provider_community_id or receiver_community_id)
    const isProvider = transaction.provider_user_id === currentUserId;
    const isReceiver = transaction.receiver_user_id === currentUserId;

    if (!isProvider && !isReceiver && !req.user.isAdmin) {
      return res.status(403).json({ error: 'User not authorized to view this transaction.' });
    }
    res.json(transaction);
  } catch (err) {
    console.error('Error fetching transaction details:', err);
    res.status(500).json({ error: 'Failed to fetch transaction details' });
  }
});

export default router;
