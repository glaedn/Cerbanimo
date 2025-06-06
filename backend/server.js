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

// Import database table creation functions
//import { createResourcesTable, createUpdatedAtTrigger as createResourcesUpdatedAtTrigger } from './models/resources.js';
//import { createNeedsTable, createNeedsUpdatedAtTrigger } from './models/needs.js';
//import { createTaskTable, createTaskUpdatedAtTrigger } from './models/tasks.js';
//import { createTokenTransactionsTable } from './models/tokenTransactions.js';
// Note: Assuming users, communities, projects tables are handled elsewhere or created manually.
// If they had similar exported creation functions, they would be imported here too.

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
  audience: 'http://localhost:4000',
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
app.use('/impact', impactRoutes);
app.use('/onboarding', jwtCheck, onboardingRoutes);

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

// Start server
const PORT = process.env.PORT || 4000;

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

    console.log('Database tables checked/initialized successfully.');
  } catch (error) {
    console.error('Error initializing database tables:', error);
    process.exit(1); // Exit if essential tables can't be set up
  }
}

initializeDatabase().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch(error => {
  // This catch is for errors during the initializeDatabase() promise itself,
  // though process.exit(1) inside initializeDatabase should already terminate.
  console.error('Failed to initialize database, server not started:', error);
  process.exit(1);
});
