import express from 'express';
import multer from 'multer';
import pg from 'pg';
import { uploadFile, generatePrivateDownloadUrl } from '../../src/utils/b2.js';
import fs from 'fs';

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
        `SELECT id, username, profile_picture, skills, interests, badges, contact_links FROM users WHERE id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }
      const profile = result.rows[0];
      profile.contact_links = profile.contact_links || [];
      if (profile.profile_picture) {
        try {
          const signedUrl = await generatePrivateDownloadUrl(profile.profile_picture);
          profile.profile_picture = signedUrl;
        } catch (err) {
          console.error('Error generating signed URL for public profile picture:', err);
          profile.profile_picture = null; // Fallback
        }
      }
      res.json(profile); // Send public profile data
    } catch (error) {
      console.error("Error fetching public profile:", error);
      res.status(500).json({ error: "Failed to fetch public profile" });
    }
  }
);

// Endpoint to fetch skills and interests pool
router.get('/options', async (req, res) => {
  try {
    // Modified query to only return skills with a non-null parent_skill_id
    // and order them alphabetically by name
    const skillsResult = await pool.query('SELECT id, name, unlocked_users FROM skills WHERE parent_skill_id IS NOT NULL ORDER BY name ASC');
    
    // Added ORDER BY to sort interests alphabetically
    const interestsResult = await pool.query('SELECT id, name FROM interests ORDER BY name ASC');

    const skillsPool = skillsResult.rows.map((row) => ({
      id: row.id,
      name: row.name,
      unlocked_users: row.unlocked_users || [], // Ensure unlocked_users is an array
    }));

    // Extract all names properly into an array
    const interestsPool = interestsResult.rows.map((row) => ({
      id: row.id,
      name: row.name
    }));

    res.json({ skillsPool, interestsPool });
  } catch (err) {
    console.error('Error fetching skills and interests:', err);
    res.status(500).json({ message: 'Failed to fetch skills and interests', error: err.message });
  }
});

// Endpoint to fetch user ID
router.get('/userId', async (req, res) => {
  try {
    const userId = req.auth.payload.sub; // Access user ID from the decoded token
    if (!userId) {
      return res.status(400).json({ message: 'User ID missing in token' });
    }
    
    const query = 'SELECT id FROM users WHERE auth0_id = $1';
    const result = await pool.query(query, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    const dbUserId = result.rows[0].id; // Extract the user ID from the result
    res.status(200).json({ id: dbUserId }); // Send the user ID as a response
  } catch (err) {
    console.error('Error fetching user ID:', err);
    res.status(500).json({ message: 'Failed to fetch user ID' });
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
      SELECT id, username, skills, interests, profile_picture, cotokens, alpha, contact_links
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
    profile.contact_links = profile.contact_links || [];

    const skillsResult = await pool.query('SELECT name FROM skills');
    const interestsResult = await pool.query('SELECT name FROM interests');

    const skillsPool = skillsResult.rows.map((row) => row.name);
    const interestsPool = interestsResult.rows.map((row) => row.name);

    if (profile.profile_picture) {
      try {
        const signedUrl = await generatePrivateDownloadUrl(profile.profile_picture);
        profile.profile_picture = signedUrl;
      } catch (err) {
        console.error('Error generating signed URL for profile picture:', err);
        // Decide how to handle: send profile with null/original filename, or error out?
        // For now, let's send null to prevent broken image links if URL generation fails.
        profile.profile_picture = null; 
      }
    }
    res.status(200).json(profile);
  } catch (err) {
    console.error('Error fetching profile:', err);
    res.status(500).json({ message: 'Failed to fetch profile' });
  }
});

// Endpoint to update user profile
router.post('/', upload.single('profilePicture'), async (req, res) => {
  let { username, skills, interests, user_id, contact_links } = req.body;
  const auth0Id = req.auth.payload.sub;
  // const profilePicture = req.file ? `/uploads/${req.file.filename}` : null; // For local deployment
  let valueForProfilePictureColumn = null; // Renaming for clarity for this subtask
  if (req.file) {
    try {
      await uploadFile(req.file.path, req.file.filename, req.file.mimetype); // Ensure B2 upload is successful
      valueForProfilePictureColumn = req.file.filename; // Store only the filename
      fs.unlinkSync(req.file.path); // Delete local temp file
    } catch (b2UploadError) {
      console.error('B2 Upload Error during profile update:', b2UploadError);
      // Decide error handling: either throw or make valueForProfilePictureColumn null
      // For now, let error propagate to be caught by main try-catch, which means profile isn't updated with new pic name
      throw b2UploadError;
    }
  }

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
        profile_picture = COALESCE($4, profile_picture),
        contact_links = $5
      WHERE id = $6
      RETURNING id, username, skills, interests, profile_picture, experience, contact_links;
    `;

    // Validate and truncate contact_links
    if (contact_links) {
      if (typeof contact_links === 'string') {
        try {
          contact_links = JSON.parse(contact_links);
        } catch (parseError) {
          return res.status(400).json({ message: 'Invalid contact_links format. Expected an array.' });
        }
      }
      if (!Array.isArray(contact_links)) {
        return res.status(400).json({ message: 'contact_links must be an array.' });
      }
      if (contact_links.length > 3) {
        contact_links = contact_links.slice(0, 3);
      }
    } else {
      contact_links = []; // Default to empty array if not provided
    }

    const values = [
      username,
      JSON.parse(skills),
      JSON.parse(interests),
      valueForProfilePictureColumn, // This is the key change
      contact_links, // Already an array or parsed/defaulted to one
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
