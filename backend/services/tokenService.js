// backend/services/tokenService.js
import pool from '../db.js';
import IdentityGateService from './IdentityGateService.js';
import { applyBurn, MARKETPLACE_BURN_RATE } from '../utils/burnUtils.js';

const awardTokensInternal = async (dbPool, receiverId, amount, reason, senderId = null) => {
  if (amount <= 0) {
    throw new Error('Token award amount must be positive.');
  }
  if (!receiverId) {
    throw new Error('Receiver ID is required.');
  }
  if (typeof amount !== 'number' && typeof amount !== 'string') {
    throw new Error('Token award amount must be a valid number or string.');
  }


  const client = await dbPool.connect();
  try {
    await client.query('BEGIN');
    await IdentityGateService.requireDiscordLinked(receiverId, client);

    // Record the transaction
    const transactionQuery = `
      INSERT INTO token_transactions (sender_id, receiver_id, amount, reason, transaction_date)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING id;
    `;
    const transactionResult = await client.query(transactionQuery, [senderId, receiverId, amount, reason]);
    const newTransactionId = transactionResult.rows[0].id;

    // Apply burn if it's a marketplace-like event
    let finalAmount = amount;
    let burnAmount = 0;
    const marketplaceReasons = ['marketplace_service_purchase', 'need_fulfillment', 'resource_exchange', 'bounty_payout'];

    if (marketplaceReasons.some(r => reason?.toLowerCase().includes(r))) {
      burnAmount = Math.floor(amount * MARKETPLACE_BURN_RATE);
      finalAmount = amount - burnAmount;

      if (burnAmount > 0) {
        await client.query(
          `INSERT INTO token_burns (transaction_type, transaction_id, burned_amount, burned_from, entity_id)
           VALUES ($1, $2, $3, $4, $5)`,
          [reason, newTransactionId, burnAmount, senderId ? 'user' : 'system', senderId || receiverId]
        );
        // If we had a community context here, we'd update total_burned.
        // For now, these generic awards might not have it easily available.
      }
    }

    // Update receiver's balance
    const updateUserQuery = 'UPDATE users SET cotokens = cotokens + $1 WHERE id = $2 RETURNING cotokens;';
    const receiverUpdateResult = await client.query(updateUserQuery, [finalAmount, receiverId]);

    if (receiverUpdateResult.rowCount === 0) {
        await client.query('ROLLBACK');
        throw new Error(`Receiver user with ID ${receiverId} not found. Transaction rolled back.`);
    }
    const receiverNewBalance = receiverUpdateResult.rows[0].cotokens;

    if (senderId) {
      const senderBalanceCheck = await client.query('SELECT cotokens FROM users WHERE id = $1 FOR UPDATE;', [senderId]);

      if (senderBalanceCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        throw new Error(`Sender user with ID ${senderId} not found. Transaction rolled back.`);
      }
      if (parseFloat(senderBalanceCheck.rows[0].cotokens) < parseFloat(amount)) {
        await client.query('ROLLBACK');
        throw new Error(`Sender user with ID ${senderId} has insufficient tokens (${senderBalanceCheck.rows[0].cotokens} available, ${amount} required). Transaction rolled back.`);
      }
      
      const senderUpdateQuery = 'UPDATE users SET cotokens = cotokens - $1 WHERE id = $2 RETURNING cotokens;';
      const senderUpdateResult = await client.query(senderUpdateQuery, [amount, senderId]);
      
      if (senderUpdateResult.rowCount === 0) {
        await client.query('ROLLBACK'); 
        throw new Error(`Sender user with ID ${senderId} not found during balance update, despite initial check. Transaction rolled back.`);
      }
      if (parseFloat(senderUpdateResult.rows[0].cotokens) < 0) {
         await client.query('ROLLBACK');
         throw new Error(`Sender's token balance went negative for user ID ${senderId}, which should not happen. Transaction rolled back.`);
      }
    }

    await client.query('COMMIT');
    return { 
        success: true, 
        transactionId: newTransactionId, 
        receiverNewBalance: receiverNewBalance 
    };

  } catch (error) {
    if (client) {
        try {
            await client.query('ROLLBACK');
        } catch (rollbackError) {
            console.error('Error during ROLLBACK:', rollbackError);
        }
    }
    console.error('Error in awardTokens service:', error.message);
    throw error; 
  } finally {
    if (client) {
      client.release();
    }
  }
};

const deductTokensInternal = async (dbPool, userId, amount, reason) => {
  if (amount <= 0) {
    throw new Error('Token deduction amount must be positive.');
  }
  if (!userId) {
    throw new Error('User ID is required.');
  }

  const client = await dbPool.connect();
  try {
    await client.query('BEGIN');

    const balanceCheck = await client.query(
      'SELECT cotokens FROM users WHERE id = $1 FOR UPDATE',
      [userId]
    );

    if (balanceCheck.rows.length === 0) {
      throw new Error(`User with ID ${userId} not found.`);
    }

    const currentBalance = balanceCheck.rows[0].cotokens;
    if (parseFloat(currentBalance) < parseFloat(amount)) {
      throw new Error(`Insufficient tokens (Available: ${currentBalance}, Required: ${amount})`);
    }

    // Record the transaction. receiver_id is NULL for deductions (burns).
    const transactionResult = await client.query(
        'INSERT INTO token_transactions (sender_id, amount, receiver_id, reason, transaction_date) VALUES ($1, $2, NULL, $3, NOW()) RETURNING id',
        [userId, amount, reason]
    );

    const updateQuery = 'UPDATE users SET cotokens = cotokens - $1 WHERE id = $2 RETURNING cotokens;';
    const updateResult = await client.query(updateQuery, [amount, userId]);

    await client.query('COMMIT');

    return {
      success: true,
      transactionId: transactionResult.rows[0].id,
      newBalance: updateResult.rows[0].cotokens
    };
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    console.error('Error in deductTokens service:', error.message);
    throw error;
  } finally {
    if (client) client.release();
  }
};

const awardTokens = async (dbPool, receiverId, amount, reason, senderId = null) => {
    const { default: TokenBridgeService } = await import('./TokenBridgeService.js');
    return TokenBridgeService.routeTransaction({
        senderId,
        receiverId,
        amount,
        type: senderId ? 'user_to_user' : 'system_to_user',
        reason
    });
};

const deductTokens = async (dbPool, userId, amount, reason) => {
    const { default: TokenBridgeService } = await import('./TokenBridgeService.js');
    return TokenBridgeService.routeTransaction({
        senderId: userId,
        receiverId: null, // burn/deduct
        amount,
        type: 'user_to_system',
        reason
    });
};

export { awardTokens, deductTokens, awardTokensInternal, deductTokensInternal };
