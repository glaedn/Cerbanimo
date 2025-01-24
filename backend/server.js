require('dotenv').config(); // Load environment variables from .env
const express = require('express');
const cors = require('cors');
const fs = require('fs');

// Import routes
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');

// Initialize app
const app = express();

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
app.use('/profile', profileRoutes);

// Example protected route
const { generateToken } = require('./services/auth/jwtUtils');
const authenticate = require('./middlewares/authenticate');

app.get('/token', (req, res) => {
  const token = generateToken('user-management');
  res.json({ token });
});

app.get('/protected', authenticate, (req, res) => {
  res.json({ message: 'You have access!', service: req.service });
});

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
