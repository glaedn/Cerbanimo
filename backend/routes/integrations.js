import express from 'express';
import pool from '../db.js';
import IntegrationManager from '../services/integrations/core/IntegrationManager.js';

const router = express.Router();

// GET /integrations/user - List all user integrations
router.get('/user', async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await pool.query(
            'SELECT id, platform, external_user_id, username, avatar_url, created_at FROM user_integrations WHERE user_id = $1',
            [userId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching user integrations:', err);
        res.status(500).json({ error: 'Failed to fetch user integrations' });
    }
});

// POST /integrations/user - Link a new user integration (manual link for MVP)
router.post('/user', async (req, res) => {
    const { platform, external_user_id, username, metadata } = req.body;
    const userId = req.user.id;

    if (!platform || !external_user_id) {
        return res.status(400).json({ error: 'platform and external_user_id are required' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO user_integrations (user_id, platform, external_user_id, username, metadata)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (user_id, platform) DO UPDATE
             SET external_user_id = EXCLUDED.external_user_id,
                 username = EXCLUDED.username,
                 metadata = EXCLUDED.metadata,
                 created_at = NOW()
             RETURNING *`,
            [userId, platform, external_user_id, username, metadata || {}]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error linking user integration:', err);
        res.status(500).json({ error: 'Failed to link integration' });
    }
});

// DELETE /integrations/user/:id - Remove a user integration
router.delete('/user/:id', async (req, res) => {
    try {
        const userId = req.user.id;
        const integrationId = req.params.id;

        const result = await pool.query(
            'DELETE FROM user_integrations WHERE id = $1 AND user_id = $2 RETURNING *',
            [integrationId, userId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Integration not found or unauthorized' });
        }

        res.status(204).send();
    } catch (err) {
        console.error('Error deleting user integration:', err);
        res.status(500).json({ error: 'Failed to delete integration' });
    }
});

// GET /integrations/community/:communityId - List all community integrations
router.get('/community/:communityId', async (req, res) => {
    const { communityId } = req.params;
    const userId = req.user.id;

    try {
        // Authorization: Check if user is a member of the community
        // In a real app, check for admin/moderator roles
        const memberCheck = await pool.query(
            'SELECT 1 FROM communities WHERE id = $1 AND $2 = ANY(members)',
            [communityId, userId]
        );

        if (memberCheck.rows.length === 0) {
            return res.status(403).json({ error: 'User is not a member of this community' });
        }

        const result = await pool.query(
            'SELECT * FROM community_integrations WHERE community_id = $1',
            [communityId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching community integrations:', err);
        res.status(500).json({ error: 'Failed to fetch community integrations' });
    }
});

// POST /integrations/community - Add/Update community integration
router.post('/community', async (req, res) => {
    const { community_id, platform, external_workspace_id, external_channel_id, config } = req.body;
    const userId = req.user.id;

    if (!community_id || !platform) {
        return res.status(400).json({ error: 'community_id and platform are required' });
    }

    try {
        // Authorization check
        const memberCheck = await pool.query(
            'SELECT 1 FROM communities WHERE id = $1 AND $2 = ANY(members)',
            [community_id, userId]
        );

        if (memberCheck.rows.length === 0) {
            return res.status(403).json({ error: 'User is not a member of this community' });
        }

        const result = await pool.query(
            `INSERT INTO community_integrations (community_id, platform, external_workspace_id, external_channel_id, config)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (community_id, platform, external_workspace_id) DO UPDATE
             SET external_channel_id = EXCLUDED.external_channel_id,
                 config = EXCLUDED.config,
                 is_active = true,
                 created_at = NOW()
             RETURNING *`,
            [community_id, platform, external_workspace_id, external_channel_id, config || {}]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error saving community integration:', err);
        res.status(500).json({ error: 'Failed to save community integration' });
    }
});

// DELETE /integrations/community/:id - Remove/Deactivate community integration
router.delete('/community/:id', async (req, res) => {
    try {
        const userId = req.user.id;
        const integrationId = req.params.id;

        // Check ownership/authorization via join
        const authCheck = await pool.query(
            `SELECT ci.community_id
             FROM community_integrations ci
             JOIN communities c ON ci.community_id = c.id
             WHERE ci.id = $1 AND $2 = ANY(c.members)`,
            [integrationId, userId]
        );

        if (authCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Unauthorized to delete this integration' });
        }

        await pool.query('DELETE FROM community_integrations WHERE id = $1', [integrationId]);
        res.status(204).send();
    } catch (err) {
        console.error('Error deleting community integration:', err);
        res.status(500).json({ error: 'Failed to delete integration' });
    }
});

export default router;
