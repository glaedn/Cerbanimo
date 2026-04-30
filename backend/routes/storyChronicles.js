// routes/storyChronicleRoutes.js
import express from 'express';
import db from '../db.js';
import { v4 as uuidv4 } from 'uuid';
import { sendNotification } from '../services/NotificationService.js';

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
    const newNode = result.rows[0];

    // Notify user of new story node (appearing in chronicle)
    try {
      await sendNotification(user_id, {
        taskId: task_id,
        message: `New chronicle entry recorded for mission: ${task_id}`,
        type: 'chronicle-entry'
      });
    } catch (notifErr) {
      console.error('Failed to send chronicle notification:', notifErr);
    }

    res.status(201).json(newNode);
    console.log('Inserted story node:', newNode);
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
     SELECT
    uc.id,
    uc.user_id,
    uc.story_node_id,
    uc.task_id,
    uc.project_id,
    uc.community_id,
    uc.title,
    uc.content_type,
    uc.reflection,
    uc.media_urls,
    uc.tags,
    uc.status,
    uc.upvotes,
    uc.created_at,
    uc.updated_at,
    uc.task_name,
    uc.project_name,
    i.label           AS impact_label,
    i.impact_weight,
    o.statement       AS outcome_statement
  FROM user_chronicles uc
  LEFT JOIN tasks t
    ON t.id = uc.task_id
  LEFT JOIN projects p
    ON p.id = COALESCE(uc.project_id, t.project_id)
  LEFT JOIN impact_nodes i
    ON i.type = 'task' AND i.entity_id = t.id
  LEFT JOIN impact_edges ie
    ON ie.from_node_id = i.id
  LEFT JOIN impact_nodes outcome_node
    ON outcome_node.id = ie.to_node_id AND outcome_node.type = 'outcome'
  LEFT JOIN outcomes o
    ON o.id = outcome_node.entity_id
  WHERE uc.user_id = $1
  ORDER BY uc.created_at DESC
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
        WITH chronicle_entries AS (
          SELECT
            uc.id,
            uc.user_id,
            uc.story_node_id,
            sn.task_id,
            uc.project_id,
            uc.community_id,
            uc.title,
            uc.content_type,
            uc.reflection,
            uc.media_urls,
            uc.tags,
            uc.status,
            uc.upvotes,
            uc.created_at,
            uc.updated_at
          FROM user_chronicles uc
          LEFT JOIN story_nodes sn ON sn.id = uc.story_node_id

          UNION ALL

          SELECT
            sn.id,
            sn.user_id,
            sn.id as story_node_id,
            sn.task_id,
            sn.project_id,
            sn.community_id,
            sn.title,
            sn.content_type,
            sn.reflection,
            sn.media_urls,
            sn.tags,
            sn.status,
            sn.upvotes,
            sn.created_at,
            sn.updated_at
          FROM story_nodes sn
          WHERE NOT EXISTS (
            SELECT 1 FROM user_chronicles uc
            WHERE uc.story_node_id = sn.id AND uc.user_id = sn.user_id
          )
        )
        SELECT
          ce.*,
          COALESCE(t.name, ce.title) as task_name,
          p.name as project_name,
          i.label as impact_label,
          i.impact_weight,
          o.statement as outcome_statement
        FROM chronicle_entries ce
        LEFT JOIN tasks t ON t.id = ce.task_id
        LEFT JOIN projects p ON p.id = COALESCE(ce.project_id, t.project_id)
        LEFT JOIN impact_nodes i ON i.type = 'task' AND i.entity_id = t.id
        LEFT JOIN impact_edges e ON e.from_node_id = i.id
        LEFT JOIN impact_nodes outcome_node ON outcome_node.id = e.to_node_id AND outcome_node.type = 'outcome'
        LEFT JOIN outcomes o ON o.id = outcome_node.entity_id
        WHERE COALESCE(ce.project_id, t.project_id) = $1
        ORDER BY ce.created_at DESC
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
