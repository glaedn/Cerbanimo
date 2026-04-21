import express from 'express';
import GuildService from '../services/GuildService.js';
import pool from '../db.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT g.*, s.name as skill_name, s.description as skill_description,
             (SELECT json_build_object(
                'health_score', gm.health_score,
                'task_demand', gm.task_demand,
                'verification_pass_rate', gm.verification_pass_rate,
                'submitted_tasks_count', gm.submitted_tasks_count
              )
              FROM guild_metrics gm
              WHERE gm.guild_id = g.id
              ORDER BY gm.recorded_at DESC
              LIMIT 1
             ) as intel
      FROM guilds g
      JOIN skills s ON g.skill_id = s.id
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/requests', async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM skill_requests WHERE status = 'pending'");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const guildQuery = `
      SELECT g.*, s.name as skill_name, s.description as skill_description
      FROM guilds g
      JOIN skills s ON g.skill_id = s.id
      WHERE g.id = $1
    `;
    const guildRes = await pool.query(guildQuery, [req.params.id]);

    if (guildRes.rows.length === 0) {
      return res.status(404).json({ error: 'Guild not found' });
    }

    const intel = await GuildService.getGuildIntelligence(req.params.id);

    const membersQuery = `
      SELECT gm.*, u.username as user_name, u.profile_picture
      FROM guild_memberships gm
      JOIN users u ON gm.user_id = u.id
      WHERE gm.guild_id = $1
    `;
    const membersRes = await pool.query(membersQuery, [req.params.id]);

    res.json({
      ...guildRes.rows[0],
      intel: intel || null,
      members: membersRes.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/tasks', async (req, res) => {
  try {
    const tasksQuery = `
      SELECT t.*, p.name as project_name
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      JOIN guilds g ON t.skill_id = g.skill_id
      WHERE g.id = $1
      ORDER BY t.priority_score DESC
    `;
    const result = await pool.query(tasksQuery, [req.params.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:skillId/intelligence', async (req, res) => {
  try {
    // Note: The frontend sends skillId here, so we map it correctly.
    const intel = await GuildService.getGuildIntelligenceBySkillId(req.params.skillId);
    res.json(intel || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/requests', async (req, res) => {
  const { requesterId, skillName, description } = req.body;
  try {
    const request = await GuildService.requestNewSkill(requesterId, skillName, description);
    res.status(201).json(request);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/requests/:requestId/vote', async (req, res) => {
  const { userId, approve } = req.body;
  try {
    const request = await GuildService.voteOnSkillRequest(req.params.requestId, userId, approve);
    res.json(request);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/memberships/:userId/sync-ranks', async (req, res) => {
  try {
    const results = await GuildService.syncUserRanks(req.params.userId);
    res.json({ success: true, updates: results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/my-memberships/:userId', async (req, res) => {
  try {
    const query = `
      SELECT gm.*, g.name as guild_name, s.name as skill_name, g.skill_id
      FROM guild_memberships gm
      JOIN guilds g ON gm.guild_id = g.id
      JOIN skills s ON g.skill_id = s.id
      WHERE gm.user_id = $1
    `;
    const result = await pool.query(query, [req.params.userId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
