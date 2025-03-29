import express from 'express';
import multer from 'multer';
import pg from 'pg';

const { Pool } = pg;

// Create a router instance
const router = express.Router();

// PostgreSQL connection
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

router.get("/public/:userId", 
  // Remove any authentication middleware for this specific route
  async (req, res) => {
    try {
      const { userId } = req.params;

      // Ensure the query fetches only public data
      const result = await pool.query(
        `SELECT username, profile_picture, skills, interests, badges FROM users WHERE id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json(result.rows[0]); // Send public profile data
    } catch (error) {
      console.error("Error fetching public profile:", error);
      res.status(500).json({ error: "Failed to fetch public profile" });
    }
  }
);

// Endpoint to fetch skills and interests pool
router.get('/options', async (req, res) => {
  try {
    const skillsResult = await pool.query('SELECT id, name FROM skills'); 
    const interestsResult = await pool.query('SELECT name FROM interests');

    const skillsPool = skillsResult.rows.map((row) => ({
      id: row.id,
      name: row.name
    }));

    // Extract all names properly into an array
    const interestsPool = interestsResult.rows.map((row) => row.name); 

    res.json({ skillsPool, interestsPool });
  } catch (err) {
    console.error('Error fetching skills and interests:', err);
    res.status(500).json({ message: 'Failed to fetch skills and interests', error: err.message });
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
      SELECT id, username, skills, interests, profile_picture, experience
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
  const { username, skills, interests, user_id } = req.body;
  const auth0Id = req.auth.payload.sub;
  const profilePicture = req.file ? `/uploads/${req.file.filename}` : null;

  try {
    // Get user ID if not provided in request
    let userId = user_id;
    if (!userId) {
      const userQuery = 'SELECT id FROM users WHERE auth0_id = $1';
      const userResult = await pool.query(userQuery, [auth0Id]);
      
      if (userResult.rows.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      userId = userResult.rows[0].id;
    }

    // Step 1: Update user profile
    const query = `
      UPDATE users
      SET 
        username = $1,
        skills = $2,
        interests = $3,
        profile_picture = COALESCE($4, profile_picture)
      WHERE id = $5
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
    const updatedProfile = result.rows[0];

    // Step 2: Update skills table for each added skill
    const parsedSkills = JSON.parse(skills);

    for (const skill of parsedSkills) {
      const skillName = typeof skill === 'string' ? skill : skill.name;
      
      // Fetch skill entry
      const skillQuery = `SELECT id, unlocked_users FROM skills WHERE name = $1`;
      const skillResult = await pool.query(skillQuery, [skillName]);

      if (skillResult.rows.length > 0) {
        const skillData = skillResult.rows[0];
        const numericUserId = parseInt(userId);
        
        // Handle both JSONB and JSONB[] formats
        let unlockedUsers = skillData.unlocked_users || [];
        
        // Convert to array if it's not already one
        if (!Array.isArray(unlockedUsers)) {
          unlockedUsers = [unlockedUsers];
        }

        // Check if user already exists
        const userExists = unlockedUsers.some(user => 
          user.user_id === numericUserId || 
          (typeof user === 'object' && user.user_id === numericUserId)
        );

        if (!userExists) {
          // Add new user entry
          const newUserEntry = { user_id: numericUserId, level: 0, exp: 0 };
          
          // For JSONB[] array format
          const updateQuery = `
            UPDATE skills 
            SET unlocked_users = array_append(unlocked_users, $1::jsonb)
            WHERE id = $2
          `;
          
          // For regular JSONB format (alternative):
          // const updateQuery = `
          //   UPDATE skills 
          //   SET unlocked_users = $1
          //   WHERE id = $2
          // `;
          // unlockedUsers.push(newUserEntry);
          
          await pool.query(updateQuery, [
            JSON.stringify(newUserEntry), // For JSONB[]
            skillData.id
          ]);
        }
      }
    }

    res.status(200).json({ message: 'Profile updated successfully', profile: updatedProfile });
  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).json({ message: 'Failed to update profile' });
  }
});


// Export the router
export default router;
