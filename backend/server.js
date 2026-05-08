import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import { auth } from 'express-oauth2-jwt-bearer';
import rateLimit from 'express-rate-limit';
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
import pool from './db.js';
import communitiesRoutes from './routes/communities.js';
import storyChronicleRoutes from './routes/storyChronicles.js';
import resolveUser from './middlewares/resolveUser.js';
import endorsementsRoutes from './routes/endorsements.js';
import needRoutes from './routes/needs.js';
import matchingRoutes from './routes/matching.js';
import exchangeRoutes from './routes/exchange.js';
import servicesRoutes from './routes/services.js';
import spatialOpsRoutes from './routes/spatial_ops.js';
import onboardingRoutes from './routes/onboarding.js';
import adminRoutes from './routes/admin.js';
import discordConfigRoutes from './routes/discord_config.js';
import needCommentRoutes from './routes/need_comments.js';
import { validatePendingInterests } from './services/interestValidationService.js';

import impactRoutesV2 from './routes/impact_v2.js';
import verificationRoutesV2 from './routes/verification_v2.js';
import guildRoutesV2 from './routes/guilds_v2.js';
import constellationRoutesV2 from './routes/constellations_v2.js';
import resourceRoutesV2 from './routes/resources_v2.js';
import storyEngineRoutesV2 from './routes/story_engine_v2.js';
import civicKernelRoutes from './routes/civic_kernel.js';
import governanceRoutes from './routes/governance.js';
import federationRoutes from './routes/federation.js';

import TaskRoutingService from './services/TaskRoutingService.js';
import ProjectHealthService from './services/ProjectHealthService.js';
import GuildService from './services/GuildService.js';
import GuildHealthService from './services/GuildHealthService.js';
import { setIo } from './services/NotificationService.js';
import ConstellationHealthService from './services/ConstellationHealthService.js';
import WeeklyWrapUpService from './services/WeeklyWrapUpService.js';
import EscalationService from './services/EscalationService.js';
import EventBusService from './services/EventBusService.js';
import { startEventWorker } from './workers/eventWorker.js';

// Import database table creation functions
import { createImpactTables } from '../models/impact_v2.js';
import { createVerificationTables } from '../models/verification.js';
import { createGuildTables } from '../models/guilds_v2.js';
import { createConstellationTables } from '../models/constellations_v2.js';
import { createStoryTables } from '../models/story_engine_v2.js';
import { createStoryNodesTable } from '../models/story_nodes.js';
import { createUserChroniclesTable } from '../models/user_chronicles.js';
import { createStorySummariesTable } from '../models/story_summaries.js';
import { createResourcesTable } from '../models/resources.js';
import { createResourceLayerTables } from '../models/resource_layer_v2.js';
import { createDiscordConfigTable } from '../models/discord_config.js';
import { createNeedCommentsTable } from '../models/need_comments.js';
import { createNeedsTable } from '../models/needs.js';
import { createCivicKernelTables } from '../models/civic_kernel.js';
import { createSpatialLayerTables } from '../models/spatial_layer.js';
import { createSystemStateTable } from '../models/system_state.js';
import { createGovernanceTables } from '../models/governance.js';
import { createAgentTables } from '../models/agents.js';
import { alterExistingTables } from '../models/alter_tables_v2.js';
import { fixSequences } from './utils/dbFix.js';
import { create } from 'domain';


// Initialize app
const app = express();
app.set('trust proxy', 1);
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

setIo(io);


// JWT middleware for secured routes
if (!process.env.BACKEND_URL) {
  throw new Error("Environment variable BACKEND_URL is not defined. Please set it in your .env file.");
}
const jwtCheck = auth({
  audience: process.env.BACKEND_URL,
  issuerBaseURL: 'https://dev-i5331ndl5kxve1hd.us.auth0.com/',
  tokenSigningAlg: 'RS256',
});

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:3000", credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased limit for SPA load and background polling
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: 'Too many requests from this IP, please try again after 15 minutes'
});

// Apply rate limiting to all routes
app.use(limiter);

// Stricter rate limiting for sensitive endpoints
const sensitiveLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // Increased for initial login/onboarding surges
  message: 'Too many sensitive requests from this IP, please try again after an hour'
});

app.use('/auth/save-user', sensitiveLimiter);
app.use('/needs', (req, res, next) => {
  if (req.method === 'POST') return sensitiveLimiter(req, res, next);
  next();
});

// Static file serving for uploads
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}
app.use('/uploads', express.static('uploads'));

// Register routes
app.use('/auth', authRoutes);
app.use('/notifications', jwtCheck, notificationRoutes);

app.use('/profile', (req, res, next) => {
  if (req.path.startsWith('/public/') || req.path === '/search') return next();
  return jwtCheck(req, res, next);
}, profileRoutes);

app.use('/tasks', (req, res, next) => {
  if (req.method === 'GET') {
    return jwtCheck(req, res, (err) => next());
  }
  return jwtCheck(req, res, next);
}, resolveUser, taskRoutes);

app.use('/skills', jwtCheck, resolveUser, skillsRoutes);

app.use('/projects', (req, res, next) => {
  if (req.method === 'GET') {
    return jwtCheck(req, res, (err) => next());
  }
  return jwtCheck(req, res, next);
}, resolveUser, projectRoutes);

app.use('/communities', (req, res, next) => {
  if (req.method === 'GET') {
    return jwtCheck(req, res, (err) => next());
  }
  return jwtCheck(req, res, next);
}, resolveUser, communitiesRoutes);

app.use('/rewards', jwtCheck, rewardsRoutes);

app.use('/storyChronicles', (req, res, next) => {
  if (req.method === 'GET') {
    return jwtCheck(req, res, (err) => next());
  }
  return jwtCheck(req, res, next);
}, resolveUser, storyChronicleRoutes);

app.use('/endorsements', jwtCheck, resolveUser, endorsementsRoutes);

// Mount new resource and need routes
app.use('/resources', (req, res, next) => {
  if (req.method === 'GET') {
    return jwtCheck(req, res, (err) => next());
  }
  return jwtCheck(req, res, next);
}, resolveUser, resourceRoutesV2);

app.use('/needs', (req, res, next) => {
  if (req.method === 'GET') {
    return jwtCheck(req, res, (err) => next());
  }
  return jwtCheck(req, res, next);
}, resolveUser, needRoutes);

app.use('/matching', jwtCheck, resolveUser, matchingRoutes);

app.use('/exchange', jwtCheck, resolveUser, exchangeRoutes);

app.use('/impact', (req, res, next) => {
  if (req.method === 'GET') return next();
  return jwtCheck(req, res, next);
}, impactRoutesV2);

app.use('/services', (req, res, next) => {
  if (req.method === 'GET') return next();
  return jwtCheck(req, res, next);
}, servicesRoutes);

app.use('/onboarding', jwtCheck, resolveUser, onboardingRoutes);
app.use('/spatial-ops', jwtCheck, resolveUser, spatialOpsRoutes);
app.use('/admin', jwtCheck, resolveUser, adminRoutes);
app.use('/discord-config', jwtCheck, resolveUser, discordConfigRoutes);
app.use('/need-comments', jwtCheck, resolveUser, needCommentRoutes);

app.use('/impact_v2', jwtCheck, resolveUser, impactRoutesV2);
app.use('/verification_v2', jwtCheck, resolveUser, verificationRoutesV2);
app.use('/guilds_v2', jwtCheck, resolveUser, guildRoutesV2);
app.use('/constellations_v2', jwtCheck, resolveUser, constellationRoutesV2);
app.use('/resources_v2', jwtCheck, resolveUser, resourceRoutesV2);
app.use('/story_engine_v2', (req, res, next) => {
  if (req.method === 'GET') return next();
  return jwtCheck(req, res, next);
}, resolveUser, storyEngineRoutesV2);

app.use('/civic-kernel', jwtCheck, resolveUser, civicKernelRoutes);
app.use('/governance', jwtCheck, resolveUser, governanceRoutes);
app.use('/federation', jwtCheck, resolveUser, federationRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);

  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(status).json({
    error: {
      message,
      status,
      timestamp: new Date().toISOString()
    }
  });
});

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

// Nightly interest validation
cron.schedule('0 1 * * *', async () => {
  console.log('Running nightly interest validation...');
  try {
    await validatePendingInterests();
    console.log('Interest validation completed.');
  } catch (error) {
    console.error('Interest validation worker failed:', error);
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

// Automated Skill Enrichment (Daily at midnight)
cron.schedule('0 0 * * *', async () => {
  console.log('Running daily skill enrichment...');
  try {
    await GuildService.enrichSkillsAndHierarchy();
  } catch (err) {
    console.error('Skill enrichment worker failed:', err);
  }
});

// Weekly Wrap-up Generation (Daily at 2:00 AM)
cron.schedule('0 2 * * *', async () => {
  console.log('Running daily weekly wrap-up generation...');
  try {
    await WeeklyWrapUpService.generateWeeklyWrapUps();
  } catch (err) {
    console.error('Weekly wrap-up worker failed:', err);
  }
});

// Need Escalation Engine (Daily at 3:00 AM)
cron.schedule('0 3 * * *', async () => {
  console.log('Running daily need escalation check...');
  try {
    await EscalationService.checkAndEscalateNeeds();
  } catch (err) {
    console.error('Need escalation worker failed:', err);
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
console.log("DISCORD_CLIENT_ID:", process.env.DISCORD_CLIENT_ID);

// Initialize Database Tables
async function initializeDatabase() {
  try {
    // Create tables first
    //await createResourcesTable();
    //await createNeedsTable();
    //await createTaskTable(); // Includes new schema with task_type, related_resource_id, related_need_id
    //await createTokenTransactionsTable();
    
    // Then create triggers that depend on these tables
    // Ensure the trigger function (update_updated_at_column) is created once,
    // which is handled within each of these trigger creation functions by using CREATE OR REPLACE.
    //await createResourcesUpdatedAtTrigger();
    //await createNeedsUpdatedAtTrigger();
    //await createTaskUpdatedAtTrigger();
    // tokenTransactions table in this example does not have an updated_at trigger by default.

    // Ensure projects table has service columns
    await pool.query(`
      ALTER TABLE projects
      ADD COLUMN IF NOT EXISTS is_service BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS service_price INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS service_visibility TEXT[] DEFAULT '{}'
    `);

    await createImpactTables();
    await createStoryTables();
    await createStoryNodesTable();
    await createUserChroniclesTable();
    await createStorySummariesTable();
    await createNeedsTable(); // Ensure needs table exists before dependent tables
    await createCivicKernelTables();
    await createSpatialLayerTables();
    await createSystemStateTable();
    await createGovernanceTables();
    await createDiscordConfigTable();
    await createNeedCommentsTable();
    await createAgentTables();
    await alterExistingTables();
    

    console.log('Database tables roadmap update checked/initialized successfully.');
  } catch (error) {
    console.error('Error initializing roadmap database tables:', error);
    throw error; // Rethrow so .catch handles it by starting in degraded mode
  }
}

initializeDatabase().then(async () => {
  // Initialize Event System
  await EventBusService.initialize();
  startEventWorker();

  // Post-initialization synchronization
  try {
    await GuildService.syncGuildsWithSkills();
    await GuildService.syncMembershipsWithSkills();
    await GuildService.enrichSkillsAndHierarchy();

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
    console.warn('Post-initialization sync/scoring partially failed (likely DB connection):', syncError.message);
  }

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch(error => {
  console.error('CRITICAL: Database initialization failed. Starting server in degraded mode.');
  console.error(error);
  // Still start the server so the frontend doesn't get ERR_CONNECTION_REFUSED
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT} (DEGRADED MODE - DB UNREACHABLE)`);
  });
});
