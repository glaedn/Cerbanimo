import express from 'express';
import ImpactReceiptService from '../services/ImpactReceiptService.js';
import pool from '../db.js';

const router = express.Router();

router.get('/community/:communityId', async (req, res) => {
  try {
    const { communityId } = req.params;
    const receipts = await ImpactReceiptService.getCommunityReceipts(communityId);
    res.json(receipts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:receiptId', async (req, res) => {
  try {
    const { receiptId } = req.params;
    const result = await pool.query('SELECT * FROM impact_receipts WHERE id = $1', [receiptId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Receipt not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
