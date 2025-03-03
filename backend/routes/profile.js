const express = require('express');
const multer = require('multer');
const { Pool } = require('pg');

const router = express.Router();
const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

// Endpoint to fetch skills and interests pool
router.get('/options', async (req, res) => {
  try {
    const skillsResult = await pool.query('SELECT name FROM skills');
    const interestsResult = await pool.query('SELECT name FROM interests');

    const skillsPool = skillsResult.rows.map((row) => row.name);
    const interestsPool = interestsResult.rows.map((row) => row.name);

    res.json({ skillsPool, interestsPool });
  } catch (err) {
    console.error('Error fetching skills and interests:', err);
    res.status(500).json({ message: 'Failed to fetch skills and interests' });
  }
});

// Endpoint to fetch user profile
router.get('/', async (req, res) => {
  try {
    const userId = req.auth.payload.sub; // Access user ID from the decoded token
    if (!userId) {
      return res.status(400).json({ message: 'User ID missing in token' });
    }

    const query = `
      SELECT username, skills, interests, profile_picture, experience
      FROM users
      WHERE auth0_id = $1;
    `;
    const result = await pool.query(query, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const profile = result.rows[0];
    
    profile.skills = typeof profile.skills === 'string' && profile.skills.trim() !== '' 
      ? JSON.parse(profile.skills) 
      : profile.skills || [];
    profile.interests = typeof profile.interests === 'string' && profile.interests.trim() !== '' 
      ? JSON.parse(profile.interests) 
      : profile.interests || [];

    const skillsResult = await pool.query('SELECT name FROM skills');
    const interestsResult = await pool.query('SELECT name FROM interests');

    const skillsPool = skillsResult.rows.map((row) => row.name);
    const interestsPool = interestsResult.rows.map((row) => row.name);



    res.status(200).json(profile);
  } catch (err) {
    console.error('Error fetching profile:', err);
    res.status(500).json({ message: 'Failed to fetch profile' });
  }
});

// Endpoint to update user profile
router.post('/', upload.single('profilePicture'), async (req, res) => {
  const { username, skills, interests } = req.body;
  const userId = req.auth.payload.sub; // Access user ID from the decoded token
  const profilePicture = req.file ? `/uploads/${req.file.filename}` : null;

  try {
    const query = `
      UPDATE users
      SET 
        username = $1,
        skills = $2,
        interests = $3,
        profile_picture = COALESCE($4, profile_picture)
      WHERE auth0_id = $5
      RETURNING id, username, skills, interests, profile_picture, experience;
    `;
    const values = [
      username,
      JSON.parse(skills),
      JSON.parse(interests),
      profilePicture,
      userId,
    ];
    const result = await pool.query(query, values);

    res.status(200).json({ message: 'Profile updated successfully', profile: result.rows[0] });
  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

module.exports = router;
