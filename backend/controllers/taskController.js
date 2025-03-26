import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
});

const getAllTasks = async () => {
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
  return result.rows;
};

const getRelevantTasks = async (userSkills) => {
  if (userSkills.length === 0) {
    throw new Error('No skills provided');
  }

  const skillIdQuery = `
    SELECT id, name FROM skills WHERE LOWER(name) = ANY($1)
  `;
  const skillIdResult = await pool.query(skillIdQuery, [userSkills.map(skill => skill.toLowerCase())]);
  const skillIds = skillIdResult.rows.map(row => row.id);

  if (skillIds.length === 0) {
    throw new Error("No matching skills found");
  }

  const relevantTasksQuery = `
    SELECT * FROM tasks WHERE skill_id = ANY($1)
  `;
  const relevantTasks = await pool.query(relevantTasksQuery, [skillIds]);

  const taskIds = relevantTasks.rows.map(task => task.project_id);
  const projectTagsQuery = `
    SELECT id, tags
    FROM projects
    WHERE id = ANY($1)
  `;
  const projectTagsResult = await pool.query(projectTagsQuery, [taskIds]);

  return relevantTasks.rows.map(task => {
    const projectTags = projectTagsResult.rows.find(pt => pt.id === task.project_id)?.tags || [];
    return { ...task, projectTags };
  });
};

const getProjectRelevantTasks = async (userSkills, projectId) => {
  if (!projectId) {
    throw new Error('Project ID is required');
  }

  const projectTasksQuery = `
    SELECT * FROM tasks WHERE project_id = $1
  `;
  const projectTasksResult = await pool.query(projectTasksQuery, [projectId]);
  const allProjectTasks = projectTasksResult.rows;

  if (userSkills.length === 0) {
    return allProjectTasks.map(task => ({ ...task, isRelevant: false }));
  }

  const skillIdQuery = `
    SELECT id, name FROM skills WHERE LOWER(name) = ANY($1)
  `;
  const skillIdResult = await pool.query(skillIdQuery, [userSkills.map(skill => skill.toLowerCase())]);
  const skillIds = skillIdResult.rows.map(row => row.id);

  const tasksWithRelevance = allProjectTasks.map(task => ({
    ...task,
    isRelevant: skillIds.includes(task.skill_id)
  }));

  tasksWithRelevance.sort((a, b) => b.isRelevant - a.isRelevant);
  return tasksWithRelevance;
};

const getPlanetSpecificTasks = async (skillName) => {
  const query = `
    SELECT t.id AS task_id, t.name AS task_name, t.project_id, p.name AS project_name
    FROM tasks t
    JOIN skills s ON t.skill_id = s.id
    JOIN projects p ON t.project_id = p.id
    WHERE LOWER(s.name) = LOWER($1) AND t.active_ind = 1
  `;
  const result = await pool.query(query, [skillName]);
  return result.rows;
};

// Fetch tasks for a specific project
const getTasksByProjectId = async (projectId) => {
  const parsedProjectId = parseInt(projectId, 10);
  
  if (isNaN(parsedProjectId)) {
      throw new Error(`Invalid projectId: ${projectId}`);
  }

  console.log(`Fetching tasks for project ID: ${parsedProjectId}`);

  const query = `SELECT * FROM tasks WHERE project_id = $1`;
  const { rows } = await pool.query(query, [parsedProjectId]);
  
  return rows;
};

// Fetch skill names by an array of skill IDs
const getSkillNamesByIds = async (skillIds) => {
  const query = `
    SELECT id, name FROM skills WHERE id = ANY($1)
  `;
  const result = await pool.query(query, [skillIds]);
  return result.rows; // Returns [{ id: 1, name: 'Programming' }, ...]
};

// Fetch skill ID by skill name
const getSkillIdByName = async (skillName) => {
  const query = `
    SELECT id FROM skills WHERE LOWER(name) = LOWER($1) LIMIT 1
  `;
  const result = await pool.query(query, [skillName]);
  return result.rows[0] || null; // Returns { id: 1 } or null if not found
};

const acceptTask = async (taskId, userId) => {
  const updateQuery = `
    UPDATE tasks 
    SET assigned_user_ids = array_append(assigned_user_ids, $1)
    WHERE id = $2
  `;
  await pool.query(updateQuery, [userId, taskId]);
};

const createNewTask = async (title, description, skill_id, active, projectId) => {
  const insertQuery = `
    INSERT INTO tasks (name, description, skill_id, active_ind, project_id)
    VALUES ($1, $2, $3, $4, $5) RETURNING *;
  `;
  const result = await pool.query(insertQuery, [title, description, skill_id, active, projectId]);
  return result.rows[0];
};

const updateTask = async (title, description, skill_id, active, projectId, taskId) => {
  const updateQuery = `
    UPDATE tasks
    SET name = $1, description = $2, skill_id = $3, active_ind = $4, project_id = $5
    WHERE id = $6
    RETURNING *;
  `;
  const result = await pool.query(updateQuery, [title, description, skill_id, active, projectId, taskId]);
  console.log("Query Result:", result.rows);
  console.log("Query Params:", { title, description, skill_id, active, projectId, taskId });

  return result.rows[0];
};

const submitTask = async (req, res) => {
  const { taskId } = req.params;
  try {
      const result = await pool.query(
          `UPDATE tasks 
           SET submitted = TRUE, submitted_at = NOW() 
           WHERE id = $1 RETURNING *`, 
           [taskId]
      );

      if (result.rowCount === 0) {
          return res.status(404).json({ error: "Task not found" });
      }

      res.json({ message: "Task submitted for approval", task: result.rows[0] });
  } catch (error) {
      console.error("Error submitting task:", error);
      res.status(500).json({ error: "Failed to submit task" });
  }
};

const approveTask = async (taskId) => {
  try {
    // Fetch the task to get assigned users and reward tokens
    const taskQuery = `SELECT assigned_user_ids, reward_tokens FROM tasks WHERE id = $1;`;
    const taskResult = await pool.query(taskQuery, [taskId]);

    if (taskResult.rowCount === 0) {
      throw new Error("Task not found.");
    }

    const { assigned_user_ids, reward_tokens } = taskResult.rows[0];

    if (assigned_user_ids.length === 0) {
      throw new Error("No users assigned to this task.");
    }

    // Distribute rewards to all assigned users
    const rewardQuery = `
      UPDATE users 
      SET cotokens = cotokens + $1 
      WHERE id = ANY($2::int[]);
    `;
    await pool.query(rewardQuery, [reward_tokens, assigned_user_ids]);

    // Mark task as complete and clear assigned users
    const updateTaskQuery = `
      UPDATE tasks 
      SET active_ind = FALSE, submitted = FALSE, assigned_user_ids = '{}' 
      WHERE id = $1;
    `;
    await pool.query(updateTaskQuery, [taskId]);

    return { message: "Task approved, rewards distributed, and task closed." };
  } catch (error) {
    console.error("Error approving task:", error);
    throw error;
  }
};

const rejectTask = async (req, res) => {
  const { taskId } = req.params;
  try {
      const result = await pool.query(
          `UPDATE tasks 
           SET submitted = FALSE 
           WHERE id = $1 RETURNING *`, 
           [taskId]
      );

      if (result.rowCount === 0) {
          return res.status(404).json({ error: "Task not found" });
      }

      res.json({ message: "Task rejected", task: result.rows[0] });
  } catch (error) {
      console.error("Error rejecting task:", error);
      res.status(500).json({ error: "Failed to reject task" });
  }
};

const dropTask = async (taskId, userId) => {
  try {
    // Remove the user ID from assigned_user_ids array
    const updateQuery = `
      UPDATE tasks 
      SET assigned_user_ids = array_remove(assigned_user_ids, $1)
      WHERE id = $2 RETURNING *;
    `;

    const result = await pool.query(updateQuery, [userId, taskId]);

    if (result.rowCount === 0) {
      throw new Error("Task not found or user was not assigned.");
    }

    return result.rows[0];
  } catch (error) {
    console.error("Error dropping task:", error);
    throw error;
  }
};



export default {
  getAllTasks,
  getRelevantTasks,
  getProjectRelevantTasks,
  getPlanetSpecificTasks,
  acceptTask,
  getTasksByProjectId,
  getSkillNamesByIds,
  getSkillIdByName,
  createNewTask,
  updateTask,
  submitTask,
  approveTask,
  rejectTask,
  dropTask
};
