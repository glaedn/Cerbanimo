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
    const transactionResult = await client.query(transactionQuery, [senderId, receiverId, amount, reason]);
    const newTransactionId = transactionResult.rows[0].id;

    // Update receiver's balance
    const updateUserQuery = 'UPDATE users SET cotokens = cotokens + $1 WHERE id = $2 RETURNING cotokens;';
    const receiverUpdateResult = await client.query(updateUserQuery, [amount, receiverId]);

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
      if (senderBalanceCheck.rows[0].cotokens < amount) {
        await client.query('ROLLBACK');
        throw new Error(`Sender user with ID ${senderId} has insufficient tokens (${senderBalanceCheck.rows[0].cotokens} available, ${amount} required). Transaction rolled back.`);
      }
      
      const senderUpdateQuery = 'UPDATE users SET cotokens = cotokens - $1 WHERE id = $2 RETURNING cotokens;';
      const senderUpdateResult = await client.query(senderUpdateQuery, [amount, senderId]);
      
      if (senderUpdateResult.rowCount === 0) {
        await client.query('ROLLBACK'); 
        throw new Error(`Sender user with ID ${senderId} not found during balance update, despite initial check. Transaction rolled back.`);
      }
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

const deductTokens = async (dbPool, userId, amount, reason) => {
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
    if (currentBalance < amount) {
      throw new Error(`Insufficient tokens (Available: ${currentBalance}, Required: ${amount})`);
    }

    const transactionQuery = `
      INSERT INTO token_transactions (sender_id, amount, reason, transaction_date)
      VALUES ($1, $2, $3, NOW())
      RETURNING id;
    `;
    const transactionResult = await client.query(transactionQuery, [userId, amount, reason]);

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

export { awardTokens, deductTokens };
