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

const acceptTask = async (taskId, userId) => {
  const updateQuery = `
    UPDATE tasks 
    SET assigned_user_ids = array_append(assigned_user_ids, $1)
    WHERE id = $2
  `;
  await pool.query(updateQuery, [userId, taskId]);
};

const createNewTask = async (title, description, skill, active, projectId) => {
  const insertQuery = `
    INSERT INTO tasks (title, description, skill, active, project_id)
    VALUES ($1, $2, $3, $4, $5) RETURNING *;
  `;
  const result = await pool.query(insertQuery, [title, description, skill, active, projectId]);
  return result.rows[0];
};

export default {
  getAllTasks,
  getRelevantTasks,
  getProjectRelevantTasks,
  getPlanetSpecificTasks,
  acceptTask,
  createNewTask
};
