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
    let iconFilename = null; 
    if (req.file) {
      try {
        await uploadFile(req.file.path, req.file.filename, req.file.mimetype);
        iconFilename = req.file.filename;
        fs.unlinkSync(req.file.path);
      } catch (b2UploadError) {
        console.error('B2 Badge Icon Upload Error:', b2UploadError);
        return res.status(500).json({ message: 'Failed to upload badge icon to B2.' });
      }
    }

    if (!name || !description || !iconFilename) {
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

router.get('/user/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const tokenQuery = `SELECT cotokens FROM users WHERE id = $1`;
        const tokenResult = await pool.query(tokenQuery, [userId]);
        if (tokenResult.rowCount === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const tokens = tokenResult.rows[0].cotokens || 0;

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
              return { ...badge, icon: null };
            }
          }
          return badge;
        }));
        res.json({ tokens, badges: badgesWithSignedUrls });
    } catch (error) {
        console.error('Error fetching user rewards:', error);
        res.status(500).json({ error: 'Failed to fetch user rewards' });
    }
});

router.get('/balance/:userId/:communityId', async (req, res) => {
  const { userId, communityId } = req.params;

  try {
    const query = `
      SELECT
        COALESCE(SUM((token_json->>'tokens')::numeric) FILTER (WHERE COALESCE(token_json->>'mode', 'earn') = 'earn'), 0) as earned_total,
        COALESCE(SUM((token_json->>'tokens')::numeric) FILTER (WHERE token_json->>'mode' = 'receive'), 0) as received_total,
        COALESCE(SUM((token_json->>'tokens')::numeric) FILTER (WHERE token_json->>'mode' = 'spend'), 0) as spent_total,
        COALESCE(SUM((token_json->>'tokens')::numeric) FILTER (WHERE token_json->>'mode' = 'escrow'), 0) as escrowed,
        COALESCE(SUM((token_json->>'tokens')::numeric) FILTER (WHERE token_json->>'mode' = 'fulfill'), 0) as fulfilled_total,
        (
          COALESCE(SUM((token_json->>'tokens')::numeric) FILTER (WHERE COALESCE(token_json->>'mode', 'earn') IN ('earn', 'receive')), 0) -
          COALESCE(SUM((token_json->>'tokens')::numeric) FILTER (WHERE token_json->>'mode' IN ('spend', 'escrow')), 0)
        ) as spendable_balance
      FROM users u,
      LATERAL jsonb_array_elements(u.token_ledger) as token_json
      WHERE u.id = $1 AND (token_json->>'communityId')::int = $2;
    `;

    const { rows } = await pool.query(query, [userId, communityId]);

    if (rows.length === 0) {
      return res.json({
        earned_total: 0,
        received_total: 0,
        spent_total: 0,
        escrowed: 0,
        fulfilled_total: 0,
        spendable_balance: 0,
      });
    }

    res.json(rows[0]);

  } catch (error) {
    console.error(`Error fetching token balance for user ${userId} in community ${communityId}:`, error);
    res.status(500).json({ message: 'Failed to fetch token balance' });
  }
});

router.get('/transactions/:userId/:communityId', async (req, res) => {
  const { userId, communityId } = req.params;
  try {
    const query = `
      SELECT
        entry->>'mode' as mode,
        (entry->>'tokens')::numeric as tokens,
        entry->>'goodName' as good_name,
        entry->>'creationDate' as date
      FROM
        users,
        jsonb_array_elements(token_ledger) AS entry
      WHERE
        id = $1
        AND (entry->>'communityId')::int = $2
        AND entry->>'mode' IN ('spend', 'receive')
      ORDER BY
        (entry->>'creationDate')::timestamp DESC;
    `;
    const { rows } = await pool.query(query, [userId, communityId]);
    res.json(rows);
  } catch (error) {
    console.error(`Error fetching transaction history for user ${userId} in community ${communityId}:`, error);
    res.status(500).json({ message: 'Failed to fetch transaction history' });
  }
});

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
