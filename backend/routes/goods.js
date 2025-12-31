// backend/routes/goods.js
import express from 'express';
import pool from '../db.js';
import authenticate from '../middlewares/authenticate.js';

const router = express.Router();

// ✅ Route: List a new good for sale in a community
router.post('/', authenticate, async (req, res) => {
  const { communityId, name, description, price } = req.body;
  const sellerId = req.user.id;

  if (!communityId || !name || !price) {
    return res.status(400).json({ message: 'communityId, name, and price are required.' });
  }

  try {
    const insertQuery = `
      INSERT INTO goods (community_id, seller_id, name, description, price)
      VALUES ($1, $2, $3, $4, $5) RETURNING *;
    `;
    const result = await pool.query(insertQuery, [communityId, sellerId, name, description, price]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating good:', error);
    res.status(500).json({ message: 'Failed to list good for sale.' });
  }
});

// ✅ Route: Get all available goods for a specific community
router.get('/community/:communityId', async (req, res) => {
  const { communityId } = req.params;
  try {
    const query = `
      SELECT g.id, g.name, g.description, g.price, u.username as seller_name
      FROM goods g
      JOIN users u ON g.seller_id = u.id
      WHERE g.community_id = $1 AND g.status = 'available'
      ORDER BY g.created_at DESC;
    `;
    const result = await pool.query(query, [communityId]);
    res.json(result.rows);
  } catch (error)    {
    console.error(`Error fetching goods for community ${communityId}:`, error);
    res.status(500).json({ message: 'Failed to fetch goods.' });
  }
});

// ✅ Route: Purchase a good
router.post('/:goodId/purchase', authenticate, async (req, res) => {
  const { goodId } = req.params;
  const buyerId = req.user.id;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Get good details and lock the row
    const goodQuery = 'SELECT * FROM goods WHERE id = $1 AND status = \'available\' FOR UPDATE';
    const goodResult = await client.query(goodQuery, [goodId]);

    if (goodResult.rowCount === 0) {
      throw new Error('Good is not available for purchase.');
    }
    const good = goodResult.rows[0];
    const { seller_id: sellerId, price, community_id: communityId } = good;

    if (sellerId === buyerId) {
      throw new Error('You cannot purchase your own item.');
    }

    // 2. Atomically check buyer's balance and lock the user row
    const balanceQuery = `
      WITH ledger_entries AS (
        SELECT jsonb_array_elements(token_ledger) as entry
        FROM users
        WHERE id = $1 FOR UPDATE
      )
      SELECT
        (COALESCE(SUM((entry->>'tokens')::int) FILTER (WHERE COALESCE(entry->>'mode', 'earn') = 'earn'), 0) +
         COALESCE(SUM((entry->>'tokens')::int) FILTER (WHERE entry->>'mode' = 'receive'), 0)) -
        (COALESCE(SUM((entry->>'tokens')::int) FILTER (WHERE entry->>'mode' = 'spend'), 0) +
         COALESCE(SUM((entry->>'tokens')::int) FILTER (WHERE entry->>'mode' = 'escrow'), 0)) AS spendable_balance
      FROM ledger_entries
      WHERE entry->>'type' = 'community' AND (entry->>'id')::int = $2;
    `;
    const balanceResult = await client.query(balanceQuery, [buyerId, communityId]);
    const spendableBalance = balanceResult.rows[0]?.spendable_balance || 0;

    if (spendableBalance < price) {
      throw new Error('Insufficient spendable balance.');
    }

    // 3. Create a transaction record
    const transactionQuery = `
      INSERT INTO goods_transactions (good_id, buyer_id)
      VALUES ($1, $2) RETURNING *;
    `;
    const transactionResult = await client.query(transactionQuery, [goodId, buyerId]);
    const transaction = transactionResult.rows[0];

    // 4. Update the good's status to 'pending'
    await client.query('UPDATE goods SET status = \'pending\' WHERE id = $1', [goodId]);

    // 5. Add 'escrow' entry to buyer's token ledger
    const escrowEntry = {
      id: communityId,
      type: 'community',
      mode: 'escrow',
      tokens: price,
      transactionId: transaction.id,
      creationDate: new Date().toISOString(),
    };
    const updateLedgerQuery = `
      UPDATE users
      SET token_ledger = token_ledger || $1::jsonb
      WHERE id = $2;
    `;
    await client.query(updateLedgerQuery, [JSON.stringify(escrowEntry), buyerId]);

    await client.query('COMMIT');
    res.status(201).json(transaction);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Purchase failed:', error);
    res.status(500).json({ message: error.message || 'Failed to purchase good.' });
  } finally {
    client.release();
  }
});

// Route to get all transactions for the logged-in user
router.get('/transactions', authenticate, async (req, res) => {
  const userId = req.user.id;
  try {
    const query = `
      SELECT
        t.id,
        t.status,
        t.buyer_verified,
        t.seller_verified,
        g.name as good_name,
        g.price,
        t.buyer_id,
        g.seller_id
      FROM goods_transactions t
      JOIN goods g ON t.good_id = g.id
      WHERE t.buyer_id = $1 OR g.seller_id = $1
      ORDER BY t.created_at DESC;
    `;
    const result = await pool.query(query, [userId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching user transactions:', error);
    res.status(500).json({ message: 'Failed to fetch transactions.' });
  }
});

// ✅ Route: Verify a transaction
router.post('/transactions/:transactionId/verify', authenticate, async (req, res) => {
  const { transactionId } = req.params;
  const userId = req.user.id;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Get transaction details
    const txQuery = 'SELECT * FROM goods_transactions WHERE id = $1 FOR UPDATE';
    const txResult = await client.query(txQuery, [transactionId]);
    if (txResult.rowCount === 0) throw new Error('Transaction not found.');
    const transaction = txResult.rows[0];
    const { good_id: goodId, buyer_id: buyerId } = transaction;

    const goodQuery = 'SELECT * FROM goods WHERE id = $1';
    const goodResult = await client.query(goodQuery, [goodId]);
    const good = goodResult.rows[0];
    const { seller_id: sellerId, price, community_id: communityId } = good;

    // 2. Determine user role and update verification status
    let userRole;
    if (userId === buyerId) {
      userRole = 'buyer';
      await client.query('UPDATE goods_transactions SET buyer_verified = true WHERE id = $1', [transactionId]);
    } else if (userId === sellerId) {
      userRole = 'seller';
      await client.query('UPDATE goods_transactions SET seller_verified = true WHERE id = $1', [transactionId]);
    } else {
      throw new Error('You are not authorized to verify this transaction.');
    }

    // 3. Check if both parties have verified
    const updatedTxResult = await client.query('SELECT * FROM goods_transactions WHERE id = $1', [transactionId]);
    const { buyer_verified, seller_verified } = updatedTxResult.rows[0];

    if (buyer_verified && seller_verified) {
      // 4. Both verified: Finalize the transaction
      // a. Add 'fulfill' entry to buyer's ledger
      const fulfillEntry = {
        id: communityId, type: 'community', mode: 'fulfill', tokens: price,
        transactionId: transaction.id, creationDate: new Date().toISOString()
      };
      await client.query('UPDATE users SET token_ledger = token_ledger || $1::jsonb WHERE id = $2', [JSON.stringify(fulfillEntry), buyerId]);

      // b. Add 'receive' entry to seller's ledger
      const receiveEntry = {
        id: communityId, type: 'community', mode: 'receive', tokens: price,
        transactionId: transaction.id, creationDate: new Date().toISOString()
      };
      await client.query('UPDATE users SET token_ledger = token_ledger || $1::jsonb WHERE id = $2', [JSON.stringify(receiveEntry), sellerId]);

      // c. Update transaction and good status
      await client.query('UPDATE goods_transactions SET status = \'completed\' WHERE id = $1', [transactionId]);
      await client.query('UPDATE goods SET status = \'sold\' WHERE id = $1', [goodId]);

      console.log(`Transaction ${transactionId} completed.`);
    }

    await client.query('COMMIT');
    res.json({ message: `Verification successful for ${userRole}.`, transaction: updatedTxResult.rows[0] });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Verification failed:', error);
    res.status(500).json({ message: error.message || 'Failed to verify transaction.' });
  } finally {
    client.release();
  }
});


export default router;
