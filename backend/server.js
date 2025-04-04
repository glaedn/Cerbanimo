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

// Initialize app
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // Adjust for frontend URL
    methods: ["GET", "POST"]
  }
});

// Store active user connections
const connectedUsers = new Map();

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('register', (userId) => {
    connectedUsers.set(userId, socket.id);
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    for (let [userId, socketId] of connectedUsers.entries()) {
      if (socketId === socket.id) {
        connectedUsers.delete(userId);
        break;
      }
    }
  });
});

// Function to send notifications
export const sendNotification = (userId, notification) => {
  const socketId = connectedUsers.get(userId);
  if (socketId) {
    io.to(socketId).emit('notification', notification);
  }
};

// JWT middleware for secured routes
const jwtCheck = auth({
  audience: 'http://localhost:4000',
  issuerBaseURL: 'https://dev-i5331ndl5kxve1hd.us.auth0.com/',
  tokenSigningAlg: 'RS256',
});

// Middleware
app.use(cors());
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

app.use('/rewards', jwtCheck, rewardsRoutes);

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
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
