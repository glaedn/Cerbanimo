require('dotenv').config();
const express = require('express');
const { generateToken } = require('./services/auth/jwtUtils');
const authenticate = require('./middlewares/authenticate');
const app = express();
const authRoutes = require('./routes/auth');
const cors = require('cors');

// Middleware
app.use(cors());
app.use(express.json());

// Register routes
app.use('/auth', authRoutes);


// Generate a token (example route)
app.get('/token', (req, res) => {
  const token = generateToken('user-management');
  res.json({ token });
});

// Protected route
app.get('/protected', authenticate, (req, res) => {
  res.json({ message: 'You have access!', service: req.service });
});

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

