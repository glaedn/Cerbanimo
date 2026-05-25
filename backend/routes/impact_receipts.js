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

router.get('/community/:communityId/trend', async (req, res) => {
  try {
    const { communityId } = req.params;
    const query = `
      SELECT
        COALESCE(SUM(quantity) FILTER (WHERE issued_at > NOW() - INTERVAL '30 days'), 0) as current_30d,
        COALESCE(SUM(quantity) FILTER (WHERE issued_at <= NOW() - INTERVAL '30 days' AND issued_at > NOW() - INTERVAL '60 days'), 0) as prior_30d,
        COALESCE(SUM(quantity), 0) as total_impact
      FROM impact_receipts
      WHERE provider_community_id = $1 OR recipient_community_id = $1
    `;
    const result = await pool.query(query, [communityId]);
    const { current_30d, prior_30d, total_impact } = result.rows[0];

    let trend = 0;
    const c = parseFloat(current_30d);
    const p = parseFloat(prior_30d);

    if (p > 0) {
      trend = ((c - p) / p) * 100;
    } else if (c > 0) {
      trend = 100;
    }

    res.json({
      score: Math.round(parseFloat(total_impact)),
      trend: Math.round(trend),
      currentPeriod: Math.round(c),
      priorPeriod: Math.round(p)
    });
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
