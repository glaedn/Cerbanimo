import express from 'express';
import pg from 'pg';
import multer from 'multer';
import { checkAndAwardBadges } from '../services/badgeService.js';
import { uploadFile, generatePrivateDownloadUrl } from '../utils/b2.js';
import fs from 'fs';

const { Pool } = pg;
const router = express.Router();
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
});

const upload = multer({ dest: "uploads/badges/" });

router.post("/badges/create", upload.single("icon"), async (req, res) => {
  try {
    const { name, description, createdBy } = req.body;
    // const imagePath = req.file ? `/uploads/badges/${req.file.filename}` : null; // For local deployment
    let iconFilename = null; 
    if (req.file) {
      try {
        await uploadFile(req.file.path, req.file.filename, req.file.mimetype); // Ensure B2 upload is successful
        iconFilename = req.file.filename; // Store only the filename
        fs.unlinkSync(req.file.path); // Delete local temp file
      } catch (b2UploadError) {
        console.error('B2 Badge Icon Upload Error:', b2UploadError);
        return res.status(500).json({ message: 'Failed to upload badge icon to B2.' });
      }
    }

    if (!name || !description || !iconFilename) {
      // Adjusted message slightly to reflect that icon itself is required
      return res.status(400).json({ message: "All fields and icon are required" });
    }

    const insertQuery = `
      INSERT INTO badges (name, description, icon)
      VALUES ($1, $2, $3) RETURNING *;
    `;

    const result = await pool.query(insertQuery, [name, description, iconFilename]);

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

        const badgesWithSignedUrls = await Promise.all(badges.map(async (badge) => {
          if (badge.icon) {
            try {
              const signedUrl = await generatePrivateDownloadUrl(badge.icon);
              return { ...badge, icon: signedUrl };
            } catch (err) {
              console.error(`Error generating signed URL for badge icon ${badge.icon}:`, err);
              return { ...badge, icon: null }; // Fallback for this badge's icon
            }
          }
          return badge; // No icon filename to process
        }));

        res.json({ tokens, badges: badgesWithSignedUrls });
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

// Route to manually trigger badge check for a user
router.post('/user/:userId/check-badges', async (req, res) => {
  const { userId } = req.params;
  const parsedUserId = parseInt(userId, 10);

  if (isNaN(parsedUserId)) {
    return res.status(400).json({ message: 'Invalid user ID.' });
  }

  try {
    console.log(`Manually triggering badge check for user ID: ${parsedUserId}`);
    await checkAndAwardBadges(parsedUserId);
    res.status(200).json({ message: `Badge check completed for user ${parsedUserId}.` });
  } catch (error) {
    console.error(`Error during manual badge check for user ${parsedUserId}:`, error);
    res.status(500).json({ message: 'Failed to complete badge check.', error: error.message });
  }
});

export default router;
