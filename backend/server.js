import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import { auth } from 'express-oauth2-jwt-bearer';
import http from 'http';
import { Server } from 'socket.io';
import cron from 'node-cron';

// Import routes
import authRoutes from './routes/auth.js';
import profileRoutes from './routes/profile.js';
import taskRoutes from './routes/tasks.js';
import skillsRoutes from './routes/skills.js';
import projectRoutes from './routes/projects.js';
import rewardsRoutes from './routes/rewards.js';
import notificationRoutes from './routes/notifications.js';
import taskController from './controllers/taskController.js';
import communitiesRoutes from './routes/communities.js';
import storyChronicleRoutes from './routes/storyChronicles.js';
import endorsementsRoutes from './routes/endorsements.js';
import resourceRoutes from './routes/resources.js';
import needRoutes from './routes/needs.js';
import matchingRoutes from './routes/matching.js';
import exchangeRoutes from './routes/exchange.js';
import impactRoutes from './routes/impact.js';
import onboardingRoutes from './routes/onboarding.js';

import impactRoutesV2 from './routes/impact_v2.js';
import verificationRoutesV2 from './routes/verification_v2.js';
import guildRoutesV2 from './routes/guilds_v2.js';
import constellationRoutesV2 from './routes/constellations_v2.js';
import resourceRoutesV2 from './routes/resources_v2.js';
import storyEngineRoutesV2 from './routes/story_engine_v2.js';

import TaskRoutingService from './services/TaskRoutingService.js';
import ProjectHealthService from './services/ProjectHealthService.js';
import GuildService from './services/GuildService.js';
import GuildHealthService from './services/GuildHealthService.js';
import ConstellationHealthService from './services/ConstellationHealthService.js';
import pool from './db.js';

// Import database table creation functions
import { createImpactTables } from '../models/impact_v2.js';
import { createVerificationTables } from '../models/verification.js';
import { createGuildTables } from '../models/guilds_v2.js';
import { createConstellationTables } from '../models/constellations_v2.js';
import { createStoryTables } from '../models/story_engine_v2.js';
import { createResourcesTable } from '../models/resources.js';
import { createResourceLayerTables } from '../models/resource_layer_v2.js';
import { alterExistingTables } from '../models/alter_tables_v2.js';
import { fixSequences } from './utils/dbFix.js';

// Initialize app
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('join', (userId) => {
    console.log(`User ${userId} joined the room`);
    socket.join(`user_${userId}`); // So you can emit to specific users
    console.log(`User ${userId} joined their notification room`);
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
  socket.onAny((event, ...args) => {
    console.log(`Received event: ${event}`, args);
  });
});

app.set('io', io);

// Function to send notifications
export const sendNotification = async (userId, notification) => {
  const { taskId, message } = notification;

  // Check if notification for the same task already exists for the user
  const checkQuery = `
      SELECT * FROM notifications
      WHERE user_id = $1 AND task_id = $2 AND read = false
  `;

  try {
      const existingNotification = await pool.query(checkQuery, [userId, taskId]);

      // If notification exists, skip sending
      if (existingNotification.rows.length > 0) {
          console.log(`Notification for task ${taskId} already exists for user ${userId}. Skipping.`);
          return;  // Skip sending the notification
      }

      // Store notification in database
      const notificationQuery = `
          INSERT INTO notifications (user_id, task_id, message, type, created_at, read) 
          VALUES ($1, $2, $3, $4, NOW(), false)
          RETURNING *
      `;
      
      const result = await pool.query(notificationQuery, [
          userId,
          taskId,
          message,
          notification.type || 'general'
      ]);
      
      const storedNotification = result.rows[0];
      
      // Emit to specific user's room
      io.to(`user_${userId}`).emit('notification', storedNotification);
      console.log("Rooms:", io.sockets.adapter.rooms);
      console.log(`Notification sent to user ${userId}`);
      return storedNotification;
  } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
  }
};


// JWT middleware for secured routes
const jwtCheck = auth({
  audience: process.env.BACKEND_URL,
  issuerBaseURL: 'https://dev-i5331ndl5kxve1hd.us.auth0.com/',
  tokenSigningAlg: 'RS256',
});

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:3000", credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static file serving for uploads
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}
app.use('/uploads', express.static('uploads'));

// Register routes
app.use('/auth', authRoutes);
app.use('/notifications', jwtCheck, notificationRoutes);

app.use('/profile', (req, res, next) => {
  if (req.path.startsWith('/public/')) return next();
  return jwtCheck(req, res, next);
}, profileRoutes);

app.use('/tasks', (req, res, next) => {
  if (req.path.match(/^\/\d+$/)) return next();
  return jwtCheck(req, res, next);
}, taskRoutes);

app.use('/skills', jwtCheck, skillsRoutes);

app.use('/projects', (req, res, next) => {
  if (req.path.match(/^\/\d+$/)) return next();
  return jwtCheck(req, res, next);
}, projectRoutes);

app.use('/communities', jwtCheck, communitiesRoutes);

app.use('/rewards', jwtCheck, rewardsRoutes);

app.use('/storyChronicles', storyChronicleRoutes);

app.use('/endorsements', jwtCheck, endorsementsRoutes);

// Mount new resource and need routes
app.use('/resources', resourceRoutes);
app.use('/needs', needRoutes);
app.use('/matching', matchingRoutes);
app.use('/exchange', exchangeRoutes);
app.use('/impact', jwtCheck, impactRoutes);
app.use('/onboarding', jwtCheck, onboardingRoutes);

app.use('/impact_v2', impactRoutesV2);
app.use('/verification_v2', verificationRoutesV2);
app.use('/guilds_v2', guildRoutesV2);
app.use('/constellations_v2', constellationRoutesV2);
app.use('/resources_v2', resourceRoutesV2);
app.use('/story_engine_v2', storyEngineRoutesV2);

// Nightly task reset
cron.schedule('0 0 * * *', async () => {
  console.log('Running nightly reset of spent points');
  try {
    const result = await taskController.resetAllSpentPoints();
    console.log('Reset completed:', result);
  } catch (error) {
    console.error('Failed to reset spent points:', error);
  }
});

// Roadmap Background Workers
// Sync Guild Memberships (Every 15 minutes)
cron.schedule('*/15 * * * *', async () => {
  console.log('Running guild membership synchronization...');
  try {
    await GuildService.syncMembershipsWithSkills();
  } catch (err) {
    console.error('Membership sync worker failed:', err);
  }
});

// Automated Skill Hierarchy Matching (Daily at midnight)
cron.schedule('0 0 * * *', async () => {
  console.log('Running daily skill hierarchy matching...');
  try {
    await GuildService.matchSkillsHierarchy();
  } catch (err) {
    console.error('Hierarchy matching worker failed:', err);
  }
});

// Dynamic Reward & Decay Adjustment (Every 6 hours)
cron.schedule('0 */6 * * *', async () => {
  console.log('Running dynamic reward and decay adjustment');
  try {
    const adjusted = await TaskRoutingService.applyDynamicRewardAdjustment();
    console.log(`Adjusted ${adjusted.length} tasks.`);
  } catch (err) {
    console.error('Reward adjustment worker failed:', err);
  }
});

// Intelligence Scoring (Hourly)
cron.schedule('0 * * * *', async () => {
  console.log('Running intelligence scoring (Priority & Project Health)');
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

    console.log('Intelligence scoring completed.');
  } catch (err) {
    console.error('Intelligence scoring worker failed:', err);
  }
});

// Start server
const PORT = process.env.PORT || 4000;

// Essential Environment Variable Check
const requiredEnvVars = ['POSTGRES_URL', 'GEMINI_API_KEY', 'BACKEND_URL'];
const missingVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingVars.length > 0) {
  console.error('CRITICAL: Missing environment variables:', missingVars.join(', '));
  console.error('Please ensure these are defined in your .env file.');
} else {
  console.log('Environment variables loaded successfully.');
}

// Initialize Database Tables
async function initializeDatabase() {
  try {
    // Create new tables and alter existing ones
    await createImpactTables();
    await createVerificationTables();
    await createGuildTables();
    await createConstellationTables();
    await createStoryTables();
    await createResourcesTable();
    await createResourceLayerTables();
    await alterExistingTables();

    // Fix database sequences to prevent duplicate key errors (Phase 1)
    await fixSequences(pool);

    console.log('Database tables roadmap update checked/initialized successfully.');
  } catch (error) {
    console.error('Error initializing roadmap database tables:', error);
    process.exit(1); // Exit if essential tables can't be set up
  }
}

initializeDatabase().then(async () => {
  // Post-initialization synchronization
  try {
    await GuildService.syncGuildsWithSkills();
    await GuildService.syncMembershipsWithSkills();
    await GuildService.matchSkillsHierarchy();

    console.log('Performing initial intelligence scoring...');
    // Initial score all unassigned tasks
    const tasks = await pool.query("SELECT id FROM tasks WHERE status::text LIKE $1", ['%unassigned']);
    for (const task of tasks.rows) {
      await TaskRoutingService.calculatePriorityScore(task.id);
    }

    // Initial score all active projects
    const projects = await pool.query("SELECT id FROM projects WHERE status = 'active'");
    for (const project of projects.rows) {
      await ProjectHealthService.calculateHealthScore(project.id);
    }

    // Initial score all guilds
    const guilds = await pool.query("SELECT id FROM guilds WHERE status != 'dissolved'");
    for (const guild of guilds.rows) {
      await GuildHealthService.calculateGuildMetrics(guild.id);
    }

    // Initial score all active constellations
    const constellations = await pool.query("SELECT id FROM constellations WHERE status NOT IN ('completed', 'dissolved')");
    for (const constellation of constellations.rows) {
      await ConstellationHealthService.calculateConstellationMetrics(constellation.id);
    }
    console.log('Initial intelligence scoring complete.');

  } catch (syncError) {
    console.error('Failed to sync or perform initial scoring:', syncError);
  }

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch(error => {
  // This catch is for errors during the initializeDatabase() promise itself,
  // though process.exit(1) inside initializeDatabase should already terminate.
  console.error('Failed to initialize database, server not started:', error);
  process.exit(1);
});
