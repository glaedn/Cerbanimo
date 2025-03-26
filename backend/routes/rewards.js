import express from 'express';
import pg from 'pg';

const { Pool } = pg;
const router = express.Router();
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
});
// ✅ Route: Get user rewards (tokens & badges)
router.get('/user/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        // Fetch user tokens
        const tokenQuery = `SELECT cotokens FROM users WHERE id = $1`;
        const tokenResult = await pool.query(tokenQuery, [userId]);
        if (tokenResult.rowCount === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const tokens = tokenResult.rows[0].cotokens || 0;

        // Fetch user badges
        const badgeQuery = `
            SELECT b.id, b.name, b.icon 
            FROM badges b
            JOIN user_badges ub ON b.id = ANY(ub.badge_ids)
            WHERE ub.user_id = $1`;
        const badgeResult = await pool.query(badgeQuery, [userId]);
        const badges = badgeResult.rows;

        res.json({ tokens, badges });
    } catch (error) {
        console.error('Error fetching user rewards:', error);
        res.status(500).json({ error: 'Failed to fetch user rewards' });
    }
});

// ✅ Route: Get leaderboard (Top 100 users by tokens)
router.get('/leaderboard', async (req, res) => {
    try {
        const leaderboardQuery = `
            SELECT id, username, cotokens, profile_picture AS avatar
            FROM users
            ORDER BY cotokens DESC
            LIMIT 100`;
        const leaderboardResult = await pool.query(leaderboardQuery);
        
        res.json(leaderboardResult.rows);
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

export default router;
