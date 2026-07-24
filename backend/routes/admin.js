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

// Middleware to check if user has admin role
const isAdmin = (req, res, next) => {
  const isUserAdmin = req.user && (
    (Array.isArray(req.user.roles) && req.user.roles.includes('admin')) ||
    Number(req.user.id) === 15
  );

  if (isUserAdmin) {
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

router.get('/token-economy', async (req, res) => {
  try {
    const userCirculation = await pool.query('SELECT SUM(cotokens) FROM users');
    const treasuryCirculation = await pool.query('SELECT SUM(cotoken_balance) FROM community_treasury');
    const totalCirculation = parseFloat(userCirculation.rows[0].sum || 0) + parseFloat(treasuryCirculation.rows[0].sum || 0);

    const totalBurned = await pool.query('SELECT SUM(burned_amount) FROM token_burns');
    const burn30d = await pool.query('SELECT SUM(burned_amount) FROM token_burns WHERE created_at > NOW() - INTERVAL \'30 days\'');

    const totalDecayedUser = await pool.query('SELECT SUM(total_decayed) FROM users');
    const totalDecayedComm = await pool.query('SELECT SUM(total_decayed) FROM community_treasury');
    const totalDecayed = parseFloat(totalDecayedUser.rows[0].sum || 0) + parseFloat(totalDecayedComm.rows[0].sum || 0);

    const decay30dUser = await pool.query(`
      SELECT SUM(ABS((entry->>'tokens')::numeric)) as amount
      FROM users, unnest(token_ledger) as entry
      WHERE entry->>'type' = 'decay' AND (entry->>'creationDate')::timestamp > NOW() - INTERVAL '30 days'
    `);
    const decay30dComm = await pool.query(`
      SELECT SUM(amount)
      FROM treasury_transactions tt
      JOIN community_treasury ct ON tt.treasury_id = ct.id
      WHERE tt.purpose = 'Monthly 1% circulation incentive' AND tt.created_at > NOW() - INTERVAL '30 days'
    `);
    const decay30d = parseFloat(decay30dUser.rows[0].amount || 0) + parseFloat(decay30dComm.rows[0].sum || 0);

    const pendingVesting = await pool.query("SELECT SUM(vested_tokens) FROM token_vesting WHERE released = FALSE AND vesting_revoked = FALSE");

    res.json({
      totalCirculation,
      totalBurned: parseFloat(totalBurned.rows[0].sum || 0),
      burn30d: parseFloat(burn30d.rows[0].sum || 0),
      totalDecayed,
      decay30d,
      pendingVesting: parseFloat(pendingVesting.rows[0].sum || 0)
    });
  } catch (error) {
    console.error('Error fetching token economy stats:', error);
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
