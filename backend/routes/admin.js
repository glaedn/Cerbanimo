import express from 'express';
import pool from '../db.js';
import taskController from '../controllers/taskController.js';
import GuildService from '../services/GuildService.js';
import TaskRoutingService from '../services/TaskRoutingService.js';
import ProjectHealthService from '../services/ProjectHealthService.js';
import GuildHealthService from '../services/GuildHealthService.js';
import ConstellationHealthService from '../services/ConstellationHealthService.js';
import { validatePendingInterests } from '../services/interestValidationService.js';
import WeeklyWrapUpService from '../services/WeeklyWrapUpService.js';

const router = express.Router();

// Middleware to check if user is ID 15
const isAdmin = (req, res, next) => {
  if (req.user && Number(req.user.id) === 15) {
    next();
  } else {
    res.status(404).json({ message: 'Not Found' });
  }
};

// Apply isAdmin to all routes in this router
router.use(isAdmin);

// --- Reporting Endpoints ---

router.get('/stats', async (req, res) => {
  try {
    const usersCount = await pool.query('SELECT COUNT(*) FROM users');
    const projectsCount = await pool.query('SELECT COUNT(*) FROM projects');
    const tasksCount = await pool.query('SELECT COUNT(*) FROM tasks');
    const skillsCount = await pool.query('SELECT COUNT(*) FROM skills');
    const interestsCount = await pool.query('SELECT COUNT(*) FROM interests');

    res.json({
      totalUsers: parseInt(usersCount.rows[0].count),
      totalProjects: parseInt(projectsCount.rows[0].count),
      totalTasks: parseInt(tasksCount.rows[0].count),
      totalSkills: parseInt(skillsCount.rows[0].count),
      totalInterests: parseInt(interestsCount.rows[0].count),
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/user-activity', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM users
      WHERE created_at > NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at) ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching user activity:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/task-distribution', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM tasks
      GROUP BY status
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching task distribution:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// --- Action Endpoints (Manual Cron Triggers) ---

router.post('/run-task-reset', async (req, res) => {
  try {
    const result = await taskController.resetAllSpentPoints();
    res.json({ message: 'Task reset completed', result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/run-guild-sync', async (req, res) => {
  try {
    await GuildService.syncMembershipsWithSkills();
    res.json({ message: 'Guild membership sync completed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/run-skill-enrichment', async (req, res) => {
  try {
    await GuildService.enrichSkillsAndHierarchy();
    res.json({ message: 'Skill enrichment completed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/run-reward-adjustment', async (req, res) => {
  try {
    const adjusted = await TaskRoutingService.applyDynamicRewardAdjustment();
    res.json({ message: 'Reward adjustment completed', count: adjusted.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/run-intelligence-scoring', async (req, res) => {
  try {
    // Score all unassigned tasks
    const tasks = await pool.query("SELECT id FROM tasks WHERE status::text LIKE $1", ['%unassigned']);
    for (const task of tasks.rows) {
      await TaskRoutingService.calculatePriorityScore(task.id);
    }

    // Score all active projects
    const projects = await pool.query("SELECT id FROM projects WHERE status = 'active'");
    for (const project of projects.rows) {
      await ProjectHealthService.calculateHealthScore(project.id);
    }

    // Score all guilds
    const guilds = await pool.query("SELECT id FROM guilds WHERE status != 'dissolved'");
    for (const guild of guilds.rows) {
      await GuildHealthService.calculateGuildMetrics(guild.id);
    }

    // Score all active constellations
    const constellations = await pool.query("SELECT id FROM constellations WHERE status NOT IN ('completed', 'dissolved')");
    for (const constellation of constellations.rows) {
      await ConstellationHealthService.calculateConstellationMetrics(constellation.id);
    }
    res.json({ message: 'Intelligence scoring completed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/run-interest-validation', async (req, res) => {
  try {
    await validatePendingInterests();
    res.json({ message: 'Interest validation completed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/run-weekly-wrapup', async (req, res) => {
  try {
    await WeeklyWrapUpService.generateWeeklyWrapUps();
    res.json({ message: 'Weekly wrap-up generation completed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
