import express from 'express';
import pool from '../db.js';
import IdentityGateService from '../services/IdentityGateService.js';


// Create a router instance
const router = express.Router();
// Save or Update User
router.post('/save-user', async (req, res) => {
  const { sub, email, name, picture } = req.body;

  try {
    // Check if user exists
    const existingUser = await pool.query(
      `SELECT id, auth0_id, username, email, profile_picture, city, state, country,
       ST_AsGeoJSON(location_point) as location
       FROM users WHERE auth0_id = $1`,
      [sub]
    );

    if (existingUser.rows.length > 0) {
      const user = existingUser.rows[0];
      // Parse GeoJSON location if it exists
      if (user.location) {
        user.location = JSON.parse(user.location);
      }

      // Update picture if current is null
      if (!user.profile_picture && picture) {
        await pool.query(
          'UPDATE users SET profile_picture = $1 WHERE auth0_id = $2',
          [picture, sub]
        );
        user.profile_picture = picture;
      }
      return res.status(200).json({ message: 'User already exists', user });
    }

    // Insert new user
    const newUser = await pool.query(
      `INSERT INTO users (auth0_id, email, username, profile_picture)
       VALUES ($1, $2, $3, $4)
       RETURNING id, auth0_id, username, email, profile_picture`,
      [sub, email, name, picture]
    );

    res.status(201).json({ message: 'User created', user: newUser.rows[0] });
  } catch (err) {
    console.error('Error saving user:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/2fa/setup', async (req, res) => {
  const auth0Id = req.auth?.payload?.sub || req.body.sub;
  if (!auth0Id) {
    return res.status(400).json({ error: 'User ID missing in token or body' });
  }

  try {
    const userResult = await pool.query(
      'SELECT id, email FROM users WHERE auth0_id = $1',
      [auth0Id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const secret = IdentityGateService.generateTotpSecret();
    await pool.query(
      'UPDATE users SET totp_secret = $1, totp_enabled = FALSE WHERE id = $2',
      [secret, userResult.rows[0].id]
    );

    res.json({
      secret,
      otpauthUrl: IdentityGateService.buildOtpAuthUrl({
        secret,
        email: userResult.rows[0].email
      })
    });
  } catch (err) {
    console.error('Error setting up 2FA:', err);
    res.status(500).json({ error: 'Failed to set up 2FA' });
  }
});

router.post('/2fa/verify', async (req, res) => {
  const auth0Id = req.auth?.payload?.sub || req.body.sub;
  const { token } = req.body;

  if (!auth0Id || !token) {
    return res.status(400).json({ error: 'User ID and token are required' });
  }

  try {
    const userResult = await pool.query(
      'SELECT id, totp_secret FROM users WHERE auth0_id = $1',
      [auth0Id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isValid = IdentityGateService.verifyTotp(token, userResult.rows[0].totp_secret);
    if (!isValid) {
      return res.status(400).json({ verified: false, error: 'Invalid verification code' });
    }

    await pool.query(
      'UPDATE users SET totp_enabled = TRUE WHERE id = $1',
      [userResult.rows[0].id]
    );

    res.json({ verified: true });
  } catch (err) {
    console.error('Error verifying 2FA:', err);
    res.status(500).json({ error: 'Failed to verify 2FA' });
  }
});

export default router;
