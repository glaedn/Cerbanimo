import express from 'express';
import taskController from '../controllers/taskController.js';  // Import the controller

const router = express.Router();

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
    const userSkills = req.query.skills || [];
    const tasks = await taskController.getRelevantTasks(userSkills);
    res.json(tasks);
  } catch (err) {
    console.error("🔥 Error fetching relevant tasks:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Fetch relevant tasks for a specific project based on user's skills
router.get('/prelevant', async (req, res) => {
  try {
    const { skills, projectId } = req.query;
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

// Fetch tasks by project ID
router.get('/:projectId', async (req, res) => {
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
    const result = await taskController.approveTask(taskId);
    res.status(200).json(result);
  } catch (error) {
    console.error("Failed to approve task:", error);
    res.status(500).json({ error: "Failed to approve task" });
  }
});

router.put("/:taskId/reject", taskController.rejectTask);

export default router;
