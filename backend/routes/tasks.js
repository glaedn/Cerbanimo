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
  const { title, description, skill, active, projectId } = req.body;

  if (!title || !description || !skill || !projectId) {
    return res.status(400).json({ error: 'Title, description, skill, and project ID are required' });
  }

  try {
    const newTask = await taskController.createNewTask(title, description, skill, active, projectId);
    res.status(201).json(newTask);
  } catch (error) {
    console.error('Failed to create task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

export default router;
