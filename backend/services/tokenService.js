// backend/services/tokenService.js

const awardTokens = async (dbPool, receiverId, amount, reason, senderId = null) => {
  if (amount <= 0) {
    throw new Error('Token award amount must be positive.');
  }
  if (!receiverId) {
    throw new Error('Receiver ID is required.');
  }
  if (typeof amount !== 'number' || isNaN(amount)) {
    throw new Error('Token award amount must be a valid number.');
  }


  const client = await dbPool.connect();
  try {
    await client.query('BEGIN');

    // Record the transaction
    const transactionQuery = `
      INSERT INTO token_transactions (sender_id, receiver_id, amount, reason, transaction_date)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING id;
    `;
    // Ensure transaction_date is handled, assuming it defaults to NOW() or is set as above.
    const transactionResult = await client.query(transactionQuery, [senderId, receiverId, amount, reason]);
    const newTransactionId = transactionResult.rows[0].id;

    // Update receiver's balance
    // It's good practice to also select the user's current balance if needed for other logic or immediate return,
    // but RETURNING cotokens handles getting the new balance directly.
    const updateUserQuery = 'UPDATE users SET cotokens = cotokens + $1 WHERE id = $2 RETURNING cotokens;';
    const receiverUpdateResult = await client.query(updateUserQuery, [amount, receiverId]);

    if (receiverUpdateResult.rowCount === 0) {
        await client.query('ROLLBACK'); // Rollback before throwing if receiver not found
        throw new Error(`Receiver user with ID ${receiverId} not found. Transaction rolled back.`);
    }
    const receiverNewBalance = receiverUpdateResult.rows[0].cotokens;

    // Optional: Update sender's balance if senderId is provided
    if (senderId) {
      // Check sender's existence and current balance first
      const senderBalanceCheck = await client.query('SELECT cotokens FROM users WHERE id = $1 FOR UPDATE;', [senderId]);
      // Using FOR UPDATE here if we want to lock the sender's row to prevent race conditions on their balance
      // if multiple deductions could happen concurrently for the same sender.

      if (senderBalanceCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        throw new Error(`Sender user with ID ${senderId} not found. Transaction rolled back.`);
      }
      if (senderBalanceCheck.rows[0].cotokens < amount) {
        await client.query('ROLLBACK');
        throw new Error(`Sender user with ID ${senderId} has insufficient tokens (${senderBalanceCheck.rows[0].cotokens} available, ${amount} required). Transaction rolled back.`);
      }
      
      const senderUpdateQuery = 'UPDATE users SET cotokens = cotokens - $1 WHERE id = $2 RETURNING cotokens;';
      const senderUpdateResult = await client.query(senderUpdateQuery, [amount, senderId]);
      
      // This rowCount check might be redundant if the SELECT FOR UPDATE already confirmed existence,
      // but it's a safeguard.
      if (senderUpdateResult.rowCount === 0) {
        await client.query('ROLLBACK'); 
        // This state should ideally not be reached if SELECT FOR UPDATE worked and ID is correct.
        throw new Error(`Sender user with ID ${senderId} not found during balance update, despite initial check. Transaction rolled back.`);
      }
      // An additional check for senderUpdateResult.rows[0].cotokens < 0 is also a good safeguard here,
      // though the initial balance check should prevent it.
      if (senderUpdateResult.rows[0].cotokens < 0) {
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
    // Ensure rollback is attempted only if client is defined and transaction started
    if (client) {
        try {
            await client.query('ROLLBACK');
        } catch (rollbackError) {
            console.error('Error during ROLLBACK:', rollbackError);
            // Potentially throw a more critical error or log extensively
        }
    }
    console.error('Error in awardTokens service:', error.message);
    // Re-throw the original error to be handled by the calling route/service
    // This preserves the error type and specific message from the validation or DB operation.
    throw error; 
  } finally {
    if (client) {
      client.release();
    }
  }
};

export { awardTokens }; // ES6 module export
// module.exports = { awardTokens }; // CommonJS, if project convention changes.
