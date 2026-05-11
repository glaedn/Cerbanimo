import express from 'express';
import multer from 'multer';
import pool from '../db.js';
import { uploadFile, generatePrivateDownloadUrl } from '../utils/b2.js';
import fs from 'fs';
import { processInterests } from '../services/interestService.js';
import { processSkills } from '../services/skillService.js';
import GeocodingService from '../services/GeocodingService.js';


// Create a router instance
const router = express.Router();

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

      // Use a join to filter out pending interests from public view
      // We need to handle the fact that users.interests is currently a jsonb[] or text[]
      // This is slightly complex due to the denormalized storage in users table.
      // For now, let's fetch the user and then filter interests based on their status in the interests table.

      const result = await pool.query(
        `SELECT id, username, profile_picture, skills, interests, badges, contact_links, capacity_status, discord_user_id FROM users WHERE id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }
      const profile = result.rows[0];

      // Parse and filter interests
      let parsedInterests = [];
      if (profile.interests && Array.isArray(profile.interests)) {
        parsedInterests = profile.interests.map(i => typeof i === 'string' ? JSON.parse(i) : i);

        if (parsedInterests.length > 0) {
          const interestNames = parsedInterests.map(i => i.name);
          const statusRes = await pool.query(
            "SELECT name FROM interests WHERE name = ANY($1) AND status = 'active'",
            [interestNames]
          );
          const activeNames = new Set(statusRes.rows.map(r => r.name));
          profile.interests = parsedInterests.filter(i => activeNames.has(i.name));
        }
      }

  // Parse and filter skills
  let parsedSkills = [];
  if (profile.skills && Array.isArray(profile.skills)) {
    parsedSkills = profile.skills.map(s => typeof s === 'string' ? JSON.parse(s) : s);

    if (parsedSkills.length > 0) {
      const skillNames = parsedSkills.map(s => s.name);
      const skillStatusRes = await pool.query(
        "SELECT name FROM skills WHERE name = ANY($1) AND status = 'active'",
        [skillNames]
      );
      const activeSkillNames = new Set(skillStatusRes.rows.map(r => r.name));
      profile.skills = parsedSkills.filter(s => activeSkillNames.has(s.name));
    }
  }

      profile.contact_links = profile.contact_links || [];
      if (profile.profile_picture && !profile.profile_picture.startsWith('http')) {
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
    // Get the user's internal database ID from the token (auth0_id) or query
    let internalUserId;
    if (req.auth?.payload?.sub) {
      const userResult = await pool.query('SELECT id FROM users WHERE auth0_id = $1', [req.auth.payload.sub]);
      if (userResult.rows.length > 0) {
      internalUserId = userResult.rows[0].id;
      }
    } else if (req.user?.id) {
      internalUserId = req.user.id;
    }
    if (!internalUserId) {
      return res.status(400).json({ message: 'User ID missing or not found' });
    }

    // Modified query to only return skills with a non-null parent_skill_id
    // and that are either active or pending and created by the current user
    // and order them alphabetically by name
    const skillsResult = await pool.query(
      `SELECT id, name, unlocked_users FROM skills
       WHERE parent_skill_id IS NOT NULL
       AND (status = 'active' OR (status = 'pending' AND creator_id = $1))
       ORDER BY name ASC`,
      [internalUserId]
    );
    
    // Return interests that are active OR pending and created by the current user
    const interestsResult = await pool.query(
      `SELECT id, name FROM interests
       WHERE status = 'active'
       OR (status = 'pending' AND creator_id = $1)
       ORDER BY name ASC`,
      [internalUserId]
    );

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

// Endpoint to fetch grouped interests
router.get('/interests/grouped', async (req, res) => {
  try {
    const query = `
      SELECT category, json_agg(json_build_object('id', id, 'name', name, 'description', description)) as interests
      FROM interests
      WHERE status = 'active'
      GROUP BY category
      ORDER BY category ASC;
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching grouped interests:', err);
    res.status(500).json({ message: 'Failed to fetch grouped interests' });
  }
});

// Endpoint to fetch all user locations (anonymized if not sharing)
router.get('/locations', async (req, res) => {
  try {
    const query = `
      SELECT
        id,
        CASE WHEN share_location_publicly THEN username ELSE 'Anonymous Volunteer' END as name,
        ST_AsGeoJSON(location_point) as location,
        share_location_publicly,
        CASE WHEN share_location_publicly THEN city ELSE NULL END as city,
        CASE WHEN share_location_publicly THEN state ELSE NULL END as state,
        CASE WHEN share_location_publicly THEN country ELSE NULL END as country
      FROM users
      WHERE location_point IS NOT NULL;
    `;
    const result = await pool.query(query);
    const locations = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      location: JSON.parse(row.location),
      isPublic: row.share_location_publicly,
      city: row.city,
      state: row.state,
      country: row.country
    }));
    res.json(locations);
  } catch (err) {
    console.error('Error fetching user locations:', err);
    res.status(500).json({ message: 'Failed to fetch user locations' });
  }
});

// Endpoint to search for users by username
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.json([]);
    }

    const query = `
      SELECT id, username, profile_picture
      FROM users
      WHERE username ILIKE $1
      LIMIT 10;
    `;
    const result = await pool.query(query, [`%${q}%`]);

    // Process profile pictures if needed
    const users = await Promise.all(result.rows.map(async (u) => {
      if (u.profile_picture && !u.profile_picture.startsWith('http')) {
        try {
          u.profile_picture = await generatePrivateDownloadUrl(u.profile_picture);
        } catch (err) {
          console.error('Error generating signed URL for search result:', err);
        }
      }
      return u;
    }));

    res.json(users);
  } catch (err) {
    console.error('Error searching users:', err);
    res.status(500).json({ message: 'Failed to search users' });
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
    const userId = req.auth?.payload?.sub || req.query.sub;
    if (!userId) {
      return res.status(400).json({ message: 'User ID missing in token or query' });
    }

    const query = `
      SELECT id, username, skills, interests, profile_picture, cotokens, contact_links, capacity_status, discord_user_id, share_location_publicly, city, state, region, country, formatted_address, ST_AsGeoJSON(location_point) as location
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
    profile.location = profile.location ? JSON.parse(profile.location) : null;

    if (profile.profile_picture && !profile.profile_picture.startsWith('http')) {
      try {
        const signedUrl = await generatePrivateDownloadUrl(profile.profile_picture);
        profile.profile_picture = signedUrl;
      } catch (err) {
        console.error('Error generating signed URL for profile picture:', err);
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
  let { username, skills, interests, user_id, contact_links, capacity_status, discord_user_id, latitude, longitude, share_location_publicly, city, state, region, country, formatted_address } = req.body;
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
    // Step 0: Auto-geocoding fallback if city/state provided but coordinates are missing
    let finalLat = latitude;
    let finalLon = longitude;
    if ((city || state) && (!latitude || !longitude)) {
      const searchStr = `${city || ''} ${state || ''} ${country || ''}`.trim();
      const results = await GeocodingService.search(searchStr);
      if (results.length > 0) {
        finalLat = results[0].latitude;
        finalLon = results[0].longitude;
      }
    }

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

    // Step 1: Process interests and skills (skip blacklisted, create pending)
    const parsedInterestsInput = JSON.parse(interests);
    const processedInterests = await processInterests(parsedInterestsInput, userId);

    const parsedSkillsInput = JSON.parse(skills);
    const processedSkills = await processSkills(parsedSkillsInput, userId);

    // Step 2: Update user profile
    const query = `
      UPDATE users
      SET 
        username = $1,
        skills = $2,
        interests = $3,
        profile_picture = COALESCE($4, profile_picture),
        contact_links = $5,
        capacity_status = COALESCE($6, capacity_status),
        discord_user_id = $7,
        location_point = CASE
          WHEN $8::numeric IS NOT NULL AND $9::numeric IS NOT NULL
          THEN ST_SetSRID(ST_MakePoint($9::numeric, $8::numeric), 4326)::geography
          ELSE location_point
        END,
        share_location_publicly = COALESCE($10::boolean, share_location_publicly),
        city = COALESCE($11, city),
        state = COALESCE($12, state),
        region = COALESCE($13, region),
        country = COALESCE($14, country),
        formatted_address = COALESCE($15, formatted_address)
      WHERE id = $16
      RETURNING id, username, skills, interests, profile_picture, experience, contact_links, capacity_status, discord_user_id, share_location_publicly, city, state, region, country, formatted_address, ST_AsGeoJSON(location_point) as location;
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
      processedSkills,
      processedInterests,
      valueForProfilePictureColumn,
      contact_links,
      capacity_status,
      discord_user_id,
      finalLat || null,
      finalLon || null,
      share_location_publicly !== undefined ? share_location_publicly : null,
      city || null,
      state || null,
      region || null,
      country || null,
      formatted_address || null,
      userId,
    ];
    const result = await pool.query(query, values);
    const updatedProfile = result.rows[0];

    // Step 3: Update skills table for each added skill
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
