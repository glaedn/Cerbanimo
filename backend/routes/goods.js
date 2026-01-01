// backend/routes/goods.js
import express from 'express';
import pool from '../db.js';
import ensureAuthenticated from '../middlewares/authenticate.js';

async function authenticate(req, res, next) {
  try {
    const auth0Id = req.user?.sub;
    if (!auth0Id) return res.status(401).json({ message: 'User not found.' });
    const result = await pool.query('SELECT id FROM users WHERE auth0_id = $1', [auth0Id]);
    if (result.rowCount === 0) return res.status(401).json({ message: 'User not found.' });
    req.user.id = result.rows[0].id;
    next();
  } catch (err) {
    console.error('Authentication error:', err);
    res.status(401).json({ message: 'Unauthorized', error: err.message });
  }
}

const router = express.Router();

// ✅ Route: List a new good for sale in a community
router.post('/', ensureAuthenticated, authenticate, async (req, res) => {
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
      SELECT g.id, g.name, g.description, g.price, g.seller_id, u.username as seller_name
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

// ✅ Route: Purchase a good (Direct Exchange)
router.post('/:goodId/purchase', ensureAuthenticated, authenticate, async (req, res) => {
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
    const { seller_id: sellerId, price, community_id: communityId, name: goodName } = good;

    if (sellerId === buyerId) {
      throw new Error('You cannot purchase your own item.');
    }

    // 2. Check buyer's balance
    const { rows: balanceRows } = await client.query(
      `
      SELECT
        COALESCE(SUM((token_json->>'tokens')::numeric) FILTER (WHERE COALESCE(token_json->>'mode', 'earn') IN ('earn', 'receive')), 0) -
        COALESCE(SUM((token_json->>'tokens')::numeric) FILTER (WHERE COALESCE(token_json->>'mode', 'earn') IN ('spend', 'escrow')), 0) as spendable_balance
      FROM users u,
      LATERAL jsonb_array_elements(u.token_ledger) as token_json
      WHERE u.id = $1 AND (token_json->>'communityId')::int = $2
      `,
      [buyerId, communityId]
    );

    const spendableBalance = balanceRows[0]?.spendable_balance || 0;

    if (spendableBalance < price) {
      throw new Error('Insufficient spendable balance.');
    }

    // 3. Update good status to 'sold'
    await client.query('UPDATE goods SET status = \'sold\' WHERE id = $1', [goodId]);

    // 4. Add 'spend' entry to buyer's token ledger
    const spendEntry = {
      mode: 'spend',
      type: 'goods_purchase',
      communityId: communityId,
      goodId: goodId,
      goodName: goodName,
      tokens: price,
      creationDate: new Date(),
    };
    await client.query(
      `UPDATE users SET token_ledger = token_ledger || $1::jsonb WHERE id = $2`,
      [JSON.stringify(spendEntry), buyerId]
    );

    // 5. Add 'receive' entry to seller's token ledger
    const receiveEntry = {
      mode: 'receive',
      type: 'goods_sale',
      communityId: communityId,
      goodId: goodId,
      goodName: goodName,
      tokens: price,
      creationDate: new Date(),
    };
    await client.query(
      `UPDATE users SET token_ledger = token_ledger || $1::jsonb WHERE id = $2`,
      [JSON.stringify(receiveEntry), sellerId]
    );

    await client.query('COMMIT');
    res.status(200).json({ message: 'Purchase successful.' });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Purchase failed:', error);
    res.status(500).json({ message: error.message || 'Failed to purchase good.' });
  } finally {
    client.release();
  }
});

// ✅ Route: Remove a good listing
router.delete('/:goodId', ensureAuthenticated, authenticate, async (req, res) => {
  const { goodId } = req.params;
  const userId = req.user.id;

  try {
    const deleteQuery = `
      DELETE FROM goods WHERE id = $1 AND seller_id = $2 RETURNING *;
    `;
    const result = await pool.query(deleteQuery, [goodId, userId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Good not found or you are not authorized to remove this listing.' });
    }

    res.status(200).json({ message: 'Good listing removed successfully.' });
  } catch (error) {
    console.error('Error removing good listing:', error);
    res.status(500).json({ message: 'Failed to remove good listing.' });
  }
});

export default router;
