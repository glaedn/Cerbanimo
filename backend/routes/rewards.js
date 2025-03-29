import express from 'express';
import pg from 'pg';
import multer from 'multer';

const { Pool } = pg;
const router = express.Router();
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
});

const upload = multer({ dest: "uploads/badges/" });

router.post("/badges/create", upload.single("icon"), async (req, res) => {
  try {
    const { name, description, createdBy } = req.body;
    const imagePath = req.file ? `/uploads/badges/${req.file.filename}` : null;

    if (!name || !description || !imagePath) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const insertQuery = `
      INSERT INTO badges (name, description, icon)
      VALUES ($1, $2, $3) RETURNING *;
    `;

    const result = await pool.query(insertQuery, [name, description, imagePath]);

    res.status(201).json({ message: "Badge created successfully", badge: result.rows[0] });
  } catch (err) {
    console.error("Error creating badge:", err);
    res.status(500).json({ message: "Failed to create badge" });
  }
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
            SELECT b.id, b.name, b.icon , b.description
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
