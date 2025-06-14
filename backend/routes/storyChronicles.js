// routes/storyChronicleRoutes.js
import express from 'express';
import db from '../db.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// POST /story-node
router.post('/story-node', async (req, res) => {
  const { task_id, user_id, reflection, media_urls, tags } = req.body;
  const id = uuidv4();
  console.log('Received data:', req.body);
  try {
    const result = await db.query(
      `INSERT INTO story_nodes (id, task_id, user_id, reflection, media_urls, tags, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING *`,
      [id, task_id, user_id, reflection, media_urls, tags]
    );
    res.status(201).json(result.rows[0]);
    console.log('Inserted story node:', result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create story node' });
  }
});

// GET /user/:id/chronicle
router.get('/user/:id/chronicle', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.query(`
      SELECT *
      FROM user_chronicles
      WHERE user_id = $1
      ORDER BY created_at DESC
    `, [id]);

    // Always return an array, even if only one or zero rows
    res.status(200).json(Array.isArray(result.rows) ? result.rows : []);
  } catch (err) {
    console.error('Error fetching user chronicle:', err);
    res.status(500).json({ error: 'Failed to fetch user chronicle' });
  }
});
  

// GET /community/:id/chronicle-feed
router.get('/community/:id/chronicle-feed', async (req, res) => {
    const { id: projectId } = req.params;
  
    try {
      const result = await db.query(`
        SELECT *
        FROM user_chronicles
        WHERE project_id = $1
        ORDER BY created_at DESC
      `, [projectId]);
      console.log('Community chronicle feed:', result.rows);
      res.status(200).json(result.rows);
    } catch (err) {
      console.error('Error fetching community chronicle feed:', err);
      res.status(500).json({ error: 'Failed to fetch community chronicle feed' });
    }
  });
  
// GET /user/:id/summary
router.get('/user/:id/summary', async (req, res) => {
  const { id } = req.params;
  console.log('Fetching summary for user ID:', id);

  try {
    const summaryResult = await db.query(`
      SELECT 
        COALESCE(SUM(reward_tokens), 0) AS total_tokens,
        ARRAY_AGG(DISTINCT skill_name) AS skills
      FROM user_chronicles
      WHERE user_id = $1
    `, [id]);

    const perSkillResult = await db.query(`
      SELECT 
        skill_name,
        SUM(reward_tokens) AS tokens
      FROM user_chronicles
      WHERE user_id = $1
      GROUP BY skill_name
    `, [id]);

    const tokens_per_skill = perSkillResult.rows;

    const result = {
      ...summaryResult.rows[0],
      tokens_per_skill,
    };

    console.log('User summary:', result);
    res.status(200).json(result);
  } catch (err) {
    console.error('Error fetching user summary:', err);
    res.status(500).json({ error: 'Failed to fetch user summary' });
  }
});

export default router;
