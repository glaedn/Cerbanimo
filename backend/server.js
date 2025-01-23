require('dotenv').config();
const express = require('express');
const { generateToken } = require('./services/auth/jwtUtils');
const authenticate = require('./middlewares/authenticate');

const app = express();
app.use(express.json());

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

const authRoutes = require('./routes/auth');
app.use('/auth', authRoutes);
