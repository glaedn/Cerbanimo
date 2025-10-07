import express from 'express';
import petalController from '../controllers/petalController.js';  // Import the controller
import pool from '../db.js';

const router = express.Router();

// Fetch all petals
router.get('/', async (req, res) => {
  try {
    const petals = await petalController.getAllPetals();
    res.status(200).json(petals);
  } catch (err) {
    console.error('Error fetching petals:', err);
    res.status(500).json({ message: 'Failed to fetch petals' });
  }
});

// Fetch relevant petals based on skills
router.get('/relevant', async (req, res) => {
  try {
    // Parse skills from query parameters
    const userSkills = Array.isArray(req.query.skills) 
      ? req.query.skills 
      : [req.query.skills].filter(Boolean);

    if (userSkills.length === 0) {
      return res.status(400).json({ error: "No skills provided" });
    }

    const petals = await petalController.getRelevantPetals(userSkills);
    res.json(petals);
  } catch (err) {
    console.error("🔥 Error fetching relevant petals:", err);
    res.status(500).json({ error: "Internal server error", details: err.message });
  }
});

// Fetch relevant petals for a specific project based on user's skills
router.get('/prelevant', async (req, res) => {
  try {
    console.log('Received skills:', req.query.skills);
    console.log('Received projectId:', req.query.projectId);

    const skills = Array.isArray(req.query.skills) 
      ? req.query.skills 
      : [req.query.skills];
    const projectId = req.query.projectId;

    if (!skills || !projectId) {
      return res.status(400).json({ error: 'Skills and Project ID are required' });
    }

    const petals = await petalController.getProjectRelevantPetals(skills, projectId);
    res.json(petals);
  } catch (error) {
    console.error("🔥 Error fetching relevant petals:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Fetch planet-specific petals
router.get("/planetPetals", async (req, res) => {
  try {
    const { skills } = req.query;
    if (!skills) {
      return res.status(400).json({ error: 'Skills are required' });
    }

    const petals = await petalController.getPlanetSpecificPetals(skills);
    res.status(200).json(petals);
  } catch (err) {
    console.error("Error fetching petals:", err);
    res.status(500).json({ message: "Failed to fetch petals" });
  }
});

router.get("/accepted", async (req, res) => {
  console.log("Received accepted petals request with query:", req.query);

  // Explicitly parse userId and log the parsing
  const rawUserId = req.query.userId;
  console.log("Raw userId:", rawUserId, "Type:", typeof rawUserId);

  // More robust userId parsing
  let userId = Number(rawUserId);
  if (isNaN(userId)) {
    console.error("Invalid or missing user ID");
    return res.status(400).json({ 
      message: "Invalid User ID", 
      details: { rawUserId, parsedUserId: userId }
    });
  }

  try {
    // Log userId before query
    console.log("Fetching accepted petals for userId:", userId);

    const result = await pool.query(
      `SELECT t.id AS petal_id, t.*, p.name AS project_name, p.id AS project_id
      FROM petals t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE $1 = ANY(t.assigned_user_ids::int[])`, 
      [userId]
    );

    console.log(`Query executed successfully. Found ${result.rows.length} petals for user ${userId}`);

    // Log results for debugging (limit to first few results for clarity)
    console.log("Sample result:", result.rows.slice(0, 3));

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching accepted petals:", err);
    res.status(500).json({ 
      message: "Failed to fetch accepted petals",
      error: err.message,
      details: { userId }
    });
  }
});

router.get('/:petalId', async (req, res) => {
  try {
    const { petalId } = req.params;
    const petal = await petalController.findById(petalId);

    if (petal.error) {
      return res.status(petal.status).json({ error: petal.error });
    }

    res.json(petal);
  } catch (error) {
    console.error('Error fetching petal:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Fetch petals by project ID
router.get('/p/:projectId', async (req, res) => {
  try {
      const { projectId } = req.params;
      const parsedProjectId = parseInt(projectId, 10);

      if (isNaN(parsedProjectId)) {
          return res.status(400).json({ error: 'Invalid project ID' });
      }

      const petals = await petalController.getPetalsByProjectId(parsedProjectId);
      res.status(200).json(petals);
  } catch (err) {
      console.error('Error fetching petals by project ID:', err);
      res.status(500).json({ error: 'Failed to fetch petals for project' });
  }
});

// Get skill names for an array of skill IDs
router.get('/skillnames', async (req, res) => {
  try {
      let { skillIds } = req.query;

      if (!skillIds) {
          return res.status(400).json({ error: 'No skill IDs provided' });
      }

      // Convert comma-separated string into an array of numbers
      skillIds = skillIds.split(',').map(id => parseInt(id, 10)).filter(id => !isNaN(id));

      if (skillIds.length === 0) {
          return res.status(400).json({ error: 'Invalid skill IDs provided' });
      }

      console.log("Fetching skill names for IDs:", skillIds);

      const query = `SELECT id, name FROM skills WHERE id = ANY($1)`;
      const { rows } = await pool.query(query, [skillIds]);

      res.status(200).json(rows);
  } catch (error) {
      console.error("Failed to fetch skill names:", error);
      res.status(500).json({ error: 'Failed to fetch skill names' });
  }
});



// Get skill ID by skill name
router.get('/skillid', async (req, res) => {
  try {
      const { skillName } = req.query;

      if (!skillName) {
          return res.status(400).json({ error: 'Skill name is required' });
      }

      console.log("Searching for Skill ID:", skillName);

      const query = `SELECT id FROM skills WHERE name ILIKE $1 LIMIT 1`;
      const { rows } = await pool.query(query, [skillName]);

      if (rows.length === 0) {
          return res.status(404).json({ error: 'Skill not found' });
      }

      res.json(rows[0]);
  } catch (error) {
      console.error("Error fetching skill ID:", error);
      res.status(500).json({ error: "Internal server error" });
  }
});

// Accept a petal by updating the assigned_user_ids
router.put('/:petalId/accept', async (req, res) => {
  const { petalId } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required', success: false });
  }

  try {
    const petal = await petalController.acceptPetal(petalId, userId);
    res.json({ 
      message: 'Petal accepted successfully',
      petal,
      success: true
    });
  } catch (error) {
    res.status(500).json({ 
      error: error.message,
      success: false
    });
  }
});

// POST route to create a new petal
router.post('/newpetal', async (req, res) => {
  const { name, description, skill_id, status, projectId, reward_tokens = 10, dependencies = [], skill_level = 0 } = req.body;

  if (!name || !description || !skill_id || !projectId) {
    return res.status(400).json({ error: 'Name, description, skill, and project ID are required' });
  }

  try {
    const result = await petalController.createNewPetal(
      name, description, skill_id, status, projectId, reward_tokens, dependencies, skill_level
    );
    
    if (result.error) {
      return res.status(result.status || 500).json({ error: result.error });
    }
    
    return res.status(201).json(result);
  } catch (error) {
    console.error('Error in create petal route:', error);
    return res.status(500).json({ error: 'Server error creating petal' });
  }
});

// PUT route to update an existing petal
router.put('/update/:petalId', async (req, res) => {
  try {
    const { name, description, skill_id, status, reward_tokens, dependencies, assigned_user_ids, skill_level = 0 } = req.body;
    const active = status.startsWith('active') || status.startsWith('urgent');
    
    const result = await petalController.updatePetal(
      name,
      description,
      skill_id,
      status,
      req.body.projectId, // Ensure this is coming from the body
      req.params.petalId,
      reward_tokens,
      dependencies,
      assigned_user_ids,
      skill_level,
    );

    res.status(200).json(result);
  } catch (error) {
    console.error('Failed to update petal:', error);
    res.status(500).json({ error: 'Failed to update petal' });
  }
});

router.put('/:petalId/drop', async (req, res) => {
  const { petalId } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required', success: false });
  }

  try {
    const petal = await petalController.dropPetal(petalId, userId);
    res.json({ 
      message: 'Petal dropped successfully',
      petal,
      success: true
    });
  } catch (error) {
    res.status(500).json({ 
      error: error.message,
      success: false
    });
  }
});



router.post('/:petalId/submit', async (req, res) => {
  const io = req.app.get('io');
  // Pass the full req object to the controller, as it will now handle
  // extraction of params and body, and also platformUserId from req.body.
  // The controller will also handle initial validations.
  try {
    // petalController.submitPetal is expected to have the signature (req, res, io)
    // but per previous subpetals, it's modified to return error/success objects
    // and should not call res.json() itself for these paths.
    // The 'res' parameter might still be there if other parts of the controller use it,
    // but for this flow, we rely on its return value.
    const result = await petalController.submitPetal(req, res, io);

    if (result && result.error) {
      // If the controller returns an error object, use it to send the response
      return res.status(result.status || 500).json({ error: result.error });
    }

    // If successful, result should contain { message, petal, reviewerIds }
    // The controller now also provides the success message.
    res.status(200).json({
      message: result.message || "Petal submitted for approval", // Use message from result if available
      petal: result.petal,
      reviewerIds: result.reviewerIds,
    });
  } catch (error) {
    // This catch is for errors not handled by the controller's return path,
    // e.g., if petalController.submitPetal itself throws an unhandled exception.
    console.error("Unhandled error in submitPetal route:", error);
    res.status(500).json({ error: "An unexpected server error occurred." });
  }
});

// Approve petal route with spent_points tracking
router.put('/:petalId/approve', async (req, res) => {
  const { petalId } = req.params;
  const io = req.app.get('io'); // Get io instance the same way as submit
  
  try {
    const result = await petalController.approvePetal(petalId, io); // Just pass petalId and io
    
    if (result.error) {
      return res.status(result.status || 500).json({ error: result.error });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error in approve petal route:', error);
    return res.status(500).json({ error: 'Server error approving petal' });
  }
});

router.put("/:petalId/reject", petalController.rejectPetal);

router.post('/generate-petals', petalController.generatePetals);

router.post('/:petalId/granularize', petalController.granularizePetals);

router.put('/:petalId/review', async (req, res) => {
  const { petalId } = req.params;
  const { userId, action } = req.body; // 'approve' or 'reject'
  const io = req.app.get('io');

  try {
    const result = await petalController.processReview(petalId, userId, action, io);
    
    if (result.error) {
      return res.status(result.status || 500).json({ error: result.error });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error in review route:', error);
    return res.status(500).json({ error: 'Server error processing review' });
  }
});

router.put('/:petalId/pm-approve', async (req, res) => {
    const io = req.app.get('io');
    await petalController.approveByPM(req, res, io);
});

router.put('/:petalId/pm-reject', async (req, res) => {
    const io = req.app.get('io');
    await petalController.rejectByPM(req, res, io);
});

// Route to get petals the user is a reviewer for
router.get('/reviewer/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const petals = await petalController.getReviewerPetals(userId);
    res.status(200).json(petals);
  } catch (error) {
    console.error('Error fetching reviewer petals:', error);
    res.status(500).json({ error: 'Failed to fetch reviewer petals' });
  }
});

// Route to get petals for a project manager to approve
router.get('/pm-approval/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const petals = await petalController.getPmApprovalPetals(userId);
        res.status(200).json(petals);
    } catch (error) {
        console.error('Error fetching PM approval petals:', error);
        res.status(500).json({ error: 'Failed to fetch PM approval petals' });
    }
});

export default router;
