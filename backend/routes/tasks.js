import express from 'express';
import pg from 'pg';

const { Pool } = pg;

const router = express.Router();
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
});

// Fetch all tasks
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT 
        tasks.id AS task_id,
        tasks.name AS task_name,
        tasks.id,
        skills.category AS skill_category
      FROM tasks
      JOIN skills ON tasks.skill_id = skills.id;
    `;

    const result = await pool.query(query);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching tasks:', err);
    res.status(500).json({ message: 'Failed to fetch tasks' });
  }
});

// Fetch relevant tasks based on skills
router.get('/relevant', async (req, res) => {
  try {
    console.log("Received request for relevant tasks with skills:", req.query.skills);

    // Ensure skills are treated as an array
    const userSkills = Array.isArray(req.query.skills)
      ? req.query.skills
      : [req.query.skills];

    console.log("Parsed skills array:", userSkills);

    if (userSkills.length === 0) {
      return res.status(400).json({ error: 'No skills provided' });
    }

    // Step 1: Convert Skill Names to Skill IDs (Case-Insensitive Match)
    const skillIdQuery = `
      SELECT id, name FROM skills WHERE LOWER(name) = ANY($1)
    `;
    const skillIdResult = await pool.query(skillIdQuery, [userSkills.map(skill => skill.toLowerCase())]);
    console.log("Query Results:", skillIdResult);
    const skillIds = skillIdResult.rows.map(row => row.id);
    console.log("Mapped skill IDs:", skillIds);

    if (skillIds.length === 0) {
      return res.status(404).json({ message: "No matching skills found" });
    }

    // Step 2: Fetch Relevant Tasks Using Skill IDs
    const relevantTasksQuery = `
      SELECT * FROM tasks WHERE skill_id = ANY($1)
    `;
    const relevantTasks = await pool.query(relevantTasksQuery, [skillIds]);

    console.log("Query successful, found tasks:", relevantTasks.rows);

    // Step 3: Fetch Project Tags for Each Task
    const taskIds = relevantTasks.rows.map(task => task.project_id); // Get the project_ids from tasks
    const projectTagsQuery = `
      SELECT id, tags
      FROM projects
      WHERE id = ANY($1)
    `;
    const projectTagsResult = await pool.query(projectTagsQuery, [taskIds]);

    console.log("Project tags result:", projectTagsResult.rows);

    // Map the tags to their respective tasks
    const taskWithTags = relevantTasks.rows.map(task => {
      const projectTags = projectTagsResult.rows.find(pt => pt.id === task.project_id)?.tags || []; // Fetch tags for the correct project
      return {
        ...task,
        projectTags
      };
    });

    console.log("Task data with project tags:", taskWithTags);

    // Return tasks with project tags
    res.json(taskWithTags);
  } catch (error) {
    console.error("🔥 Error fetching relevant tasks:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Fetch planet-specific tasks
router.get("/planetTasks", async (req, res) => {
  try {
    const skillName = req.query.skills;
    const query = `
      SELECT t.id AS task_id, t.name AS task_name, t.project_id, p.name AS project_name
      FROM tasks t
      JOIN skills s ON t.skill_id = s.id
      JOIN projects p ON t.project_id = p.id
      WHERE LOWER(s.name) = LOWER($1) AND t.active_ind = 1
    `;
    const result = await pool.query(query, [skillName]);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Error fetching tasks:", err);
    res.status(500).json({ message: "Failed to fetch tasks" });
  }
});

export default router;
