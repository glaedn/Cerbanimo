import express from 'express';
import taskController from '../controllers/taskController.js';  // Import the controller
import pg from 'pg';

const { Pool } = pg;
const router = express.Router();

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
});
// Fetch all tasks
router.get('/', async (req, res) => {
  try {
    const tasks = await taskController.getAllTasks();
    res.status(200).json(tasks);
  } catch (err) {
    console.error('Error fetching tasks:', err);
    res.status(500).json({ message: 'Failed to fetch tasks' });
  }
});

// Fetch relevant tasks based on skills
router.get('/relevant', async (req, res) => {
  try {
    // Parse skills from query parameters
    const userSkills = Array.isArray(req.query.skills) 
      ? req.query.skills 
      : [req.query.skills].filter(Boolean);

    if (userSkills.length === 0) {
      return res.status(400).json({ error: "No skills provided" });
    }

    const tasks = await taskController.getRelevantTasks(userSkills);
    res.json(tasks);
  } catch (err) {
    console.error("🔥 Error fetching relevant tasks:", err);
    res.status(500).json({ error: "Internal server error", details: err.message });
  }
});

// Fetch relevant tasks for a specific project based on user's skills
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

    const tasks = await taskController.getProjectRelevantTasks(skills, projectId);
    res.json(tasks);
  } catch (error) {
    console.error("🔥 Error fetching relevant tasks:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Fetch planet-specific tasks
router.get("/planetTasks", async (req, res) => {
  try {
    const { skills } = req.query;
    if (!skills) {
      return res.status(400).json({ error: 'Skills are required' });
    }

    const tasks = await taskController.getPlanetSpecificTasks(skills);
    res.status(200).json(tasks);
  } catch (err) {
    console.error("Error fetching tasks:", err);
    res.status(500).json({ message: "Failed to fetch tasks" });
  }
});

router.get("/accepted", async (req, res) => {
  console.log("Received accepted tasks request with query:", req.query);

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
    console.log("Fetching accepted tasks for userId:", userId);

    const result = await pool.query(
      `SELECT t.id AS task_id, t.*, p.name AS project_name, p.id AS project_id
      FROM tasks t 
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE $1 = ANY(t.assigned_user_ids::int[])`, 
      [userId]
    );

    console.log(`Query executed successfully. Found ${result.rows.length} tasks for user ${userId}`);

    // Log results for debugging (limit to first few results for clarity)
    console.log("Sample result:", result.rows.slice(0, 3));

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching accepted tasks:", err);
    res.status(500).json({ 
      message: "Failed to fetch accepted tasks", 
      error: err.message,
      details: { userId }
    });
  }
});

router.get('/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;

    const query = `
      SELECT 
        t.id, 
        t.name, 
        t.description, 
        t.project_id, 
        p.name as project_name,
        t.active_ind,
        t.submitted
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.id = $1
    `;

    const result = await pool.query(query, [taskId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching task details:', error);
    res.status(500).json({ error: 'Failed to fetch task details' });
  }
});

// Fetch tasks by project ID
router.get('/p/:projectId', async (req, res) => {
  try {
      const { projectId } = req.params;
      const parsedProjectId = parseInt(projectId, 10);

      if (isNaN(parsedProjectId)) {
          return res.status(400).json({ error: 'Invalid project ID' });
      }

      const tasks = await taskController.getTasksByProjectId(parsedProjectId);
      res.status(200).json(tasks);
  } catch (err) {
      console.error('Error fetching tasks by project ID:', err);
      res.status(500).json({ error: 'Failed to fetch tasks for project' });
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

// Accept a task by updating the assigned_user_ids
router.put('/:taskId/accept', async (req, res) => {
  const { taskId } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    await taskController.acceptTask(taskId, userId);
    res.status(200).json({ message: 'Task accepted successfully' });
  } catch (error) {
    console.error('Failed to accept task:', error);
    res.status(500).json({ error: 'Failed to accept task' });
  }
});

// POST route to create a new task
router.post('/newtask', async (req, res) => {
  const { title, description, skill_id, active, projectId } = req.body;

  if (!title || !description || !skill_id || !projectId) {
    return res.status(400).json({ error: 'Title, description, skill, and project ID are required' });
  }

  try {
    const newTask = await taskController.createNewTask(title, description, skill_id, active, projectId);
    res.status(201).json(newTask);
  } catch (error) {
    console.error('Failed to create task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// PUT route to update an existing task
router.put('/update/:taskId', async (req, res) => {
  const { title, description, skill_id, active, projectId } = req.body;
  const { taskId } = req.params;
  if (!title || !description || !skill_id || !projectId ) {
    return res.status(400).json({ error: 'Title, description, skill, and project ID are required' });
  }

  try {
    const updateTask = await taskController.updateTask(title, description, skill_id, active, projectId, taskId);
    res.status(201).json(updateTask);
  } catch (error) {
    console.error('Failed to create task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

router.put('/:taskId/drop', async (req, res) => {
  const { taskId } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    const updatedTask = await taskController.dropTask(taskId, userId);
    res.status(200).json({ message: 'Task dropped successfully', task: updatedTask });
  } catch (error) {
    console.error('Failed to drop task:', error);
    res.status(500).json({ error: 'Failed to drop task' });
  }
});



router.post("/:taskId/submit", taskController.submitTask);

router.put("/:taskId/approve", async (req, res) => {
  const { taskId } = req.params;

  try {
    // Fetch the task with assigned users and skill_id using pool query
    const taskResult = await pool.query('SELECT * FROM tasks WHERE id = $1', [taskId]);
    if (taskResult.rows.length === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const task = taskResult.rows[0];
    const { assigned_user_ids, skill_id } = task;

    // Ensure assigned_user_ids and skill_id are present
    if (!assigned_user_ids || !skill_id || assigned_user_ids.length === 0) {
      console.error('Missing assigned user IDs or skill ID:', task);
      return res.status(400).json({ message: 'Task must have assigned users and belong to a skill' });
    }

    // Assuming 'completed_by' is derived from the first user in the assigned_user_ids array
    const completedByUserId = assigned_user_ids[0];  // Modify this logic as needed

    // Fetch the skill associated with the task
    const skillResult = await pool.query('SELECT * FROM skills WHERE id = $1', [skill_id]);
    if (skillResult.rows.length === 0) {
      return res.status(404).json({ message: 'Skill not found' });
    }

    const skill = skillResult.rows[0];
    let unlocked_users = skill.unlocked_users || [];

    // Find the user in the unlocked_users array
    let userSkill = unlocked_users.find(u => u.user_id === completedByUserId);

    if (!userSkill) {
      // User gets Level 1 for their first task
      unlocked_users.push({ user_id: completedByUserId, level: 1, exp: task.reward_tokens });
    } else {
      // Increase EXP
      userSkill.exp += 1;

      // Check if user should level up
      const requiredExp = 30 * userSkill.level;
      if (userSkill.exp >= requiredExp) {
        userSkill.level += 1;
      }

      // Update the user entry in unlocked_users
      unlocked_users = unlocked_users.map(u => (u.user_id === completedByUserId ? userSkill : u));
    }

    // Ensure unlocked_users is a valid JSONB array
    const updatedUnlockedUsers = unlocked_users;

    // Update unlocked_users in the database as a proper jsonb[] array
    await pool.query('UPDATE skills SET unlocked_users = $1 WHERE id = $2', [
      updatedUnlockedUsers,  // Pass the array directly
      skill_id
    ]);

    // Add task to user's experience
    await pool.query(
      'UPDATE users SET experience = array_append(experience, $1) WHERE id = $2',
      [taskId, completedByUserId]
    );

    // Approve the task
    await pool.query('UPDATE tasks SET submitted = FALSE, active_ind = FALSE, assigned_user_ids = NULL WHERE id = $1;', [taskId]);

    res.json({ message: 'Task approved, experience and skill level updated' });

  } catch (error) {
    console.error('Error approving task:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});



router.put("/:taskId/reject", taskController.rejectTask);

export default router;
