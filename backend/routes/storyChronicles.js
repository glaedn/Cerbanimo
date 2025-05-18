// routes/storyChronicleRoutes.js
import express from 'express';
import db from '../db.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// POST /story-node
router.post('/story-node', async (req, res) => {
  const { task_id, user_id, reflection, media_urls, tags } = req.body;
  const id = uuidv4();
  try {
    const result = await db.query(
      `INSERT INTO story_nodes (id, task_id, user_id, reflection, media_urls, tags, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING *`,
      [id, task_id, user_id, reflection, media_urls, tags]
    );
    res.status(201).json(result.rows[0]);
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
  
      res.status(200).json(result.rows);
    } catch (err) {
      console.error('Error fetching user chronicle:', err);
      res.status(500).json({ error: 'Failed to fetch user chronicle' });
    }
  });
  

// POST /story-node/:id/endorse
router.post('/story-node/:id/endorse', async (req, res) => {
  const storyNodeId = req.params.id;
  const { endorser_id, emoji, badge, comment } = req.body;
  const id = uuidv4();
  try {
    const result = await db.query(
      `INSERT INTO endorsements (id, story_node_id, endorser_id, emoji, badge, comment, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING *`,
      [id, storyNodeId, endorser_id, emoji, badge, comment]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create endorsement' });
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
  
      res.status(200).json(result.rows);
    } catch (err) {
      console.error('Error fetching community chronicle feed:', err);
      res.status(500).json({ error: 'Failed to fetch community chronicle feed' });
    }
  });
  

export default router;
