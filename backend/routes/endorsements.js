// routes/endorsements.js
import express from "express";
import pg from "pg";
import dayjs from "dayjs";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

const router = express.Router();

const ENDORSEMENT_COOLDOWN_MINUTES = 5;

export async function canEndorse(user_id, story_node_id) {
  // Check if this user already endorsed this story
  const exists = await pool.query(
    `SELECT 1 FROM endorsements
     WHERE endorser_id = $1 AND story_node_id = $2`,
    [user_id, story_node_id]
  );

  if (exists.rowCount > 0) {
    return { allowed: false, reason: "Already endorsed this story node" };
  }

  // Check if user endorsed anything in the past 5 minutes
  const recent = await pool.query(
    `SELECT created_at FROM endorsements
     WHERE endorser_id = $1
     ORDER BY created_at DESC LIMIT 1`,
    [user_id]
  );

  if (recent.rowCount > 0) {
    const last = dayjs(recent.rows[0].created_at);
    const now = dayjs();
    const minutesSince = now.diff(last, "minute");
    if (minutesSince < ENDORSEMENT_COOLDOWN_MINUTES) {
      return {
        allowed: false,
        reason: `You must wait ${
          ENDORSEMENT_COOLDOWN_MINUTES - minutesSince
        } more minutes before endorsing again.`,
      };
    }
  }

  return { allowed: true };
}

// POST /endorsements
router.post("/", async (req, res) => {
  const {
    user_id,
    story_node_id,
    emoji,
    badge,
    comment,
    multiplier = 1.0,
  } = req.body;

  const { allowed, reason } = await canEndorse(user_id, story_node_id);
  if (!allowed) {
    return res.status(429).json({ error: reason });
  }

  if (multiplier > 2.0) {
    return res.status(400).json({ error: "Multiplier too high" });
  }

  try {
    // Check if user already endorsed this story node
    const { rowCount } = await pool.query(
      "SELECT 1 FROM endorsements WHERE endorser_id = $1 AND story_node_id = $2",
      [user_id, story_node_id]
    );

    if (rowCount > 0) {
      return res
        .status(403)
        .json({ error: "Already endorsed this story node" });
    }

    // Optionally: Check for abuse (same IP, too frequent, etc.)
    // e.g. check last 10 minutes of endorsements

    await pool.query(
      `INSERT INTO endorsements (endorser_id, story_node_id, emoji, badge, comment, multiplier)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [user_id, story_node_id, emoji, badge, comment, multiplier]
    );

    // Optional: Update token rewards here

    res.status(201).json({ success: true });
  } catch (err) {
    console.error("Error adding endorsement:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
