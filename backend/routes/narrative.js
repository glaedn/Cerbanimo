import express from 'express';
import pool from '../db.js';

const router = express.Router();

// GET /narrative/user/:userId/constellation
// Fetches data for the Civic Identity Constellation
router.get('/user/:userId/constellation', async (req, res) => {
  const { userId } = req.params;
  try {
    // 1. Fetch domain expertise from skills/user_chronicles
    const domainsResult = await pool.query(`
      SELECT
        skill_name as label,
        SUM(reward_tokens) as total_tokens
      FROM user_chronicles
      WHERE user_id = $1
      GROUP BY skill_name
    `, [userId]);

    // 2. Fetch trust signals for constellation links
    const trustResult = await pool.query(`
      SELECT
        s.name as domain_label,
        ct.score,
        u.username as trustee_name
      FROM contextual_trust ct
      JOIN skills s ON ct.domain_id = s.id
      JOIN users u ON ct.trustee_id = u.id
      WHERE ct.trustee_id = $1
    `, [userId]);

    // Construct node/link structure for D3
    const nodes = [{ id: 'core', label: 'Civic Core', type: 'core', size: 30 }];
    const links = [];

    domainsResult.rows.forEach(row => {
      nodes.push({
        id: row.label,
        label: row.label,
        type: 'domain',
        size: Math.min(25, 10 + (row.total_tokens / 10))
      });
      links.push({ source: 'core', target: row.label });
    });

    res.json({ nodes, links });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /narrative/user/:userId/lineage
// Fetches mentorship lineage
router.get('/user/:userId/lineage', async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await pool.query(`
      SELECT
        mr.*,
        u_mentor.username as mentor_name,
        u_mentee.username as mentee_name,
        s.name as skill_name
      FROM mentorship_relations mr
      JOIN users u_mentor ON mr.mentor_id = u_mentor.id
      JOIN users u_mentee ON mr.mentee_id = u_mentee.id
      LEFT JOIN skills s ON mr.skill_id = s.id
      WHERE mr.mentor_id = $1 OR mr.mentee_id = $1
    `, [userId]);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /narrative/user/:userId/propagation
// Fetches downstream impact chains
router.get('/user/:userId/propagation', async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await pool.query(`
      SELECT
        ip.*,
        sn.title as root_story_title,
        sn.reflection as root_reflection
      FROM impact_propagation ip
      JOIN story_nodes sn ON ip.root_story_node_id = sn.id
      WHERE sn.user_id = $1
    `, [userId]);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /narrative/user/:userId/chronicle-arcs
// Fetches story nodes grouped into narrative arcs
router.get('/user/:userId/chronicle-arcs', async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await pool.query(`
      SELECT
        sn.*,
        p.name as project_name,
        t.name as task_name
      FROM story_nodes sn
      LEFT JOIN projects p ON sn.project_id = p.id
      LEFT JOIN tasks t ON sn.task_id = t.id
      WHERE sn.user_id = $1
      ORDER BY sn.created_at DESC
    `, [userId]);

    // Group by project_name as a simple way to create "Mission Arcs"
    const arcs = [];
    const arcMap = new Map();

    result.rows.forEach(story => {
      const arcLabel = story.project_name || 'Individual Growth';
      if (!arcMap.has(arcLabel)) {
        arcMap.set(arcLabel, {
          id: arcLabel.toLowerCase().replace(/\s+/g, '-'),
          label: arcLabel.toUpperCase(),
          type: story.project_name ? 'mission' : 'growth',
          stories: []
        });
        arcs.push(arcMap.get(arcLabel));
      }
      arcMap.get(arcLabel).stories.push(story);
    });

    res.json(arcs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /narrative/institutional-memory
router.get('/institutional-memory', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        sn.id,
        sn.title as label,
        sn.created_at as date,
        sn.story_type as type
      FROM story_nodes sn
      WHERE sn.story_type IN ('crisis', 'governance', 'community')
      ORDER BY sn.created_at DESC
      LIMIT 20
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
