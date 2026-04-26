import express from 'express';
import pool from '../db.js';

const router = express.Router();

// ✅ Fetch skills by "category" (top-level skills with no parent or self as parent)
router.get('/', async (req, res) => {
  try {
    // If ?categoryId is provided, fetch children of that skill; otherwise, fetch top-level "categories"
    const { categoryId } = req.query;

    let query, params;

    if (categoryId) {
      // Fetch skills whose parent_skill_id matches the given categoryId
      query = `SELECT id, name, description, parent_skill_id FROM skills WHERE parent_skill_id = $1 AND id != $1`;
      params = [categoryId];
    } else {
      // Fetch top-level skills (categories): parent_skill_id is null or parent_skill_id = id
      query = `
        SELECT id, name, description, parent_skill_id
        FROM skills
        WHERE parent_skill_id IS NULL OR parent_skill_id = id
      `;
      params = [];
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "No skills found" });
    }

    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Error fetching skills:", err);
    res.status(500).json({ message: "Failed to fetch skills" });
  }
});

// Bulk unlock/lock skills for a user
router.post('/bulk-unlock', async (req, res) => {
  const { skillChanges, fullSkills } = req.body;
  const userId = req.user?.id;

  if (!userId || !Array.isArray(skillChanges)) {
    return res.status(400).json({ message: "User not identified or skillChanges array missing" });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const change of skillChanges) {
      const { skillId, action } = change; // action: 'unlock' or 'lock'

      if (action === 'unlock') {
        const newUserEntry = { user_id: parseInt(userId), level: 0, exp: 0 };
        // Update skills table
        await client.query(`
          UPDATE skills
          SET unlocked_users = array_append(COALESCE(unlocked_users, ARRAY[]::jsonb[]), $1::jsonb)
          WHERE id = $2 AND NOT EXISTS (
            SELECT 1 FROM (SELECT unnest(COALESCE(unlocked_users, ARRAY[]::jsonb[])) as user_info) sub
            WHERE (user_info->>'user_id')::int = $3
          )
        `, [JSON.stringify(newUserEntry), skillId, userId]);

        // Update users table - Add to skills JSONB array if not present
        await client.query(`
          UPDATE users
          SET skills = array_append(
            COALESCE(skills, ARRAY[]::text[]),
            $1::text
          )
          WHERE id = $2
            AND NOT ($1::text = ANY(COALESCE(skills, ARRAY[]::text[])))
        `, [JSON.stringify({ id: skillId, name: change.skillName }), userId]);

      } else if (action === 'lock') {
        // Update skills table
        await client.query(`
          UPDATE skills
          SET unlocked_users = (
            SELECT array_agg(user_info)
            FROM unnest(COALESCE(unlocked_users, ARRAY[]::jsonb[])) as user_info
            WHERE (user_info->>'user_id')::int != $1
          )
          WHERE id = $2
        `, [userId, skillId]);

        // Update users table - Remove from skills JSONB array
        await client.query(`
          UPDATE users
          SET skills = (
            SELECT COALESCE(jsonb_agg(x), '[]'::jsonb)
            FROM jsonb_array_elements(COALESCE(skills, '[]'::jsonb)) AS x
            WHERE (x->>'id')::int != $1
          )
          WHERE id = $2
        `, [skillId, userId]);
      }
    }

    // Also update the users table with the full current list of skills
    if (fullSkills) {
      await client.query(`
        UPDATE users
        SET skills = $1::text[]
        WHERE id = $2
      `, [fullSkills.map(skill => JSON.stringify(skill)), userId]);
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

    const query = `SELECT id, name, description, parent_skill_id, unlocked_users FROM skills`;
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
