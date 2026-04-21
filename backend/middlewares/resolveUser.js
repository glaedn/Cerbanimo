import pool from '../db.js';

const resolveUser = async (req, res, next) => {
  if (!req.auth || !req.auth.payload || !req.auth.payload.sub) {
    // If not authenticated, we just proceed without attaching req.user
    // Downstream handlers should check for req.user if they need it.
    return next();
  }

  const auth0Id = req.auth.payload.sub;

  try {
    const result = await pool.query('SELECT id, username FROM users WHERE auth0_id = $1', [auth0Id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found in database' });
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    console.error('Error resolving user:', error);
    res.status(500).json({ message: 'Internal server error resolving user' });
  }
};

export default resolveUser;
