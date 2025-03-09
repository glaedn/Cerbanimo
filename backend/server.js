import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import { auth } from 'express-oauth2-jwt-bearer';

// Import routes
import authRoutes from './routes/auth.js';
import profileRoutes from './routes/profile.js';
import taskRoutes from './routes/tasks.js';
import skillsRoutes from './routes/skills.js'; // ✅ Ensure the `.js` extension is included
import projectRoutes from './routes/projects.js';

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
app.use('/profile', jwtCheck, profileRoutes); // Protect profile routes
app.use('/tasks', taskRoutes);
app.use('/skills', skillsRoutes); 
app.use('/projects', projectRoutes);
// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
