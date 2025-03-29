import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import { auth } from 'express-oauth2-jwt-bearer';

// Import routes
import authRoutes from './routes/auth.js';
import profileRoutes from './routes/profile.js';
import taskRoutes from './routes/tasks.js';
import skillsRoutes from './routes/skills.js';
import projectRoutes from './routes/projects.js';
import rewardsRoutes from './routes/rewards.js';

// Initialize app
const app = express();

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
  fs.mkdirSync('uploads'); // Ensure the uploads folder exists
}
app.use('/uploads', express.static('uploads'));

// Register routes
app.use('/auth', authRoutes);

// Apply JWT check to routes that need authentication
app.use('/profile', (req, res, next) => {
  // Check if it's a public route
  if (req.path.startsWith('/public/')) {
    return next(); // Skip authentication for public routes
  }
  // Apply JWT check for other profile routes
  return jwtCheck(req, res, next);
}, profileRoutes);

app.use('/tasks', (req, res, next) => {
  // Check if it's a route fetching tasks for a specific project
  if (req.path.match(/^\/\d+$/)) { // Matches routes like /123
    return next(); // Skip authentication for single project tasks routes
  }
  // Apply JWT check for other task routes
  return jwtCheck(req, res, next);
}, taskRoutes);
app.use('/skills', jwtCheck, skillsRoutes); 
app.use('/projects', (req, res, next) => {
  // Check if it's a public route
  if (req.path.match(/^\/\d+$/)) { // Matches routes like /123
    return next(); // Skip authentication for single project routes
  }
  // Apply JWT check for other project routes
  return jwtCheck(req, res, next);
}, projectRoutes);
app.use('/rewards', jwtCheck, rewardsRoutes);

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});