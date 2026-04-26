import express from 'express';
import pool from '../db.js';

const router = express.Router();

// ✅ Fetch skills by category
router.get('/', async (req, res) => {
  try {
    const category = req.query.category;

    // Validate category input
    if (!category || typeof category !== 'string') {
      return res.status(400).json({ message: "Valid category is required" });
    }

    const query = `SELECT DISTINCT name FROM skills WHERE category = $1`;
    const result = await pool.query(query, [category]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "No skills found for this category" });
    }

    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Error fetching skills:", err);
    res.status(500).json({ message: "Failed to fetch skills" });
  }
});

// Bulk unlock/lock skills for a user
router.post('/bulk-unlock', async (req, res) => {
  const { userId, skillChanges } = req.body;

  if (!userId || !Array.isArray(skillChanges)) {
    return res.status(400).json({ message: "userId and skillChanges array are required" });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const change of skillChanges) {
      const { skillId, action } = change; // action: 'unlock' or 'lock'

      if (action === 'unlock') {
        const newUserEntry = { user_id: parseInt(userId), level: 0, exp: 0 };
        // Use JSONB[] array format logic from profile.js
        await client.query(`
          UPDATE skills
          SET unlocked_users = array_append(COALESCE(unlocked_users, ARRAY[]::jsonb[]), $1::jsonb)
          WHERE id = $2 AND NOT EXISTS (
            SELECT 1 FROM (SELECT unnest(COALESCE(unlocked_users, ARRAY[]::jsonb[])) as user_info) sub
            WHERE (user_info->>'user_id')::int = $3
          )
        `, [JSON.stringify(newUserEntry), skillId, userId]);
      } else if (action === 'lock') {
        await client.query(`
          UPDATE skills
          SET unlocked_users = (
            SELECT array_agg(user_info)
            FROM unnest(COALESCE(unlocked_users, ARRAY[]::jsonb[])) as user_info
            WHERE (user_info->>'user_id')::int != $1
          )
          WHERE id = $2
        `, [userId, skillId]);
      }
    }

    await client.query('COMMIT');
    res.status(200).json({ message: "Skills updated successfully" });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Error bulk updating skills:", err);
    res.status(500).json({ message: "Failed to update skills" });
  } finally {
    client.release();
  }
});

//Fetch the whole Skills table.
router.get('/all', async (req, res) => {
  try {

    const query = `SELECT id, name, description, category, parent_skill_id, unlocked_users FROM skills`;
    const result = await pool.query(query);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "No skills found" });
    }

    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Error fetching skills:", err);
    res.status(500).json({ message: "Failed to fetch skills" });
  }
});

export default router;
