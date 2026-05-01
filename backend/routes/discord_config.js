import express from 'express';
import pool from '../db.js';

const router = express.Router();

// GET /discord-config/:communityId
router.get('/:communityId', async (req, res) => {
  const { communityId } = req.params;
  try {
    const result = await pool.query('SELECT * FROM community_discord_config WHERE community_id = $1', [communityId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Discord config not found for this community' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching discord config:', err);
    res.status(500).json({ error: 'Failed to fetch discord config' });
  }
});

// POST /discord-config
router.post('/', async (req, res) => {
  const { community_id, guild_id, need_channel_id, alert_channel_id } = req.body;

  if (!community_id || !guild_id) {
    return res.status(400).json({ error: 'community_id and guild_id are required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO community_discord_config (community_id, guild_id, need_channel_id, alert_channel_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (community_id) DO UPDATE
       SET guild_id = EXCLUDED.guild_id,
           need_channel_id = EXCLUDED.need_channel_id,
           alert_channel_id = EXCLUDED.alert_channel_id,
           updated_at = NOW()
       RETURNING *`,
      [community_id, guild_id, need_channel_id, alert_channel_id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error saving discord config:', err);
    res.status(500).json({ error: 'Failed to save discord config' });
  }
});

export default router;
