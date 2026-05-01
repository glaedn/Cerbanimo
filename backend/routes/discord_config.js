import express from 'express';
import pool from '../db.js';
import DiscordBotService from '../services/DiscordBotService.js';

const router = express.Router();

// GET /discord-config/:communityId
router.get('/:communityId', async (req, res) => {
  const { communityId } = req.params;
  const userId = req.user.id;
  try {
    // Authorization: Check if user is a member of the community
    const memberCheck = await pool.query(
        'SELECT 1 FROM communities WHERE id = $1 AND $2 = ANY(members)',
        [communityId, userId]
    );

    if (memberCheck.rows.length === 0) {
        return res.status(403).json({ error: 'User is not a member of this community' });
    }

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
  let { community_id, guild_id, need_channel_id, alert_channel_id } = req.body;
  const userId = req.user.id;

  if (!community_id || !guild_id) {
    return res.status(400).json({ error: 'community_id and guild_id are required' });
  }

  try {
    // Authorization: Check if user is a member of the community
    // TODO: Ideally check for admin role if roles are implemented
    const memberCheck = await pool.query(
        'SELECT 1 FROM communities WHERE id = $1 AND $2 = ANY(members)',
        [community_id, userId]
    );

    if (memberCheck.rows.length === 0) {
        return res.status(403).json({ error: 'User is not a member of this community' });
    }
  } catch (err) {
      console.error('Authorization check failed:', err);
      return res.status(500).json({ error: 'Failed to verify authorization' });
  }

  // Resolve invites if provided
  if (guild_id.includes('discord.gg/')) {
    const resolved = await DiscordBotService.resolveInvite(guild_id);
    if (resolved) guild_id = resolved.guildId;
  }
  if (need_channel_id && need_channel_id.includes('discord.gg/')) {
    const resolved = await DiscordBotService.resolveInvite(need_channel_id);
    if (resolved) need_channel_id = resolved.channelId;
  }
  if (alert_channel_id && alert_channel_id.includes('discord.gg/')) {
    const resolved = await DiscordBotService.resolveInvite(alert_channel_id);
    if (resolved) alert_channel_id = resolved.channelId;
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
