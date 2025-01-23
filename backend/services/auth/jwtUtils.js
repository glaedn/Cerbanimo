const jwt = require('jsonwebtoken');

// Generate JWT
const generateToken = (service) => {
  const secret = process.env.JWT_SECRET;
  return jwt.sign({ service }, secret, { expiresIn: '1h' });
};

// Verify JWT
const verifyToken = (token) => {
  const secret = process.env.JWT_SECRET;
  return jwt.verify(token, secret);
};

module.exports = { generateToken, verifyToken };
