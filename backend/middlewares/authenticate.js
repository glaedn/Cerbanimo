const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).send('Unauthorized');

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.service = decoded.service;
    next();
  } catch (err) {
    res.status(401).send('Invalid Token');
  }
};

module.exports = authenticate;
