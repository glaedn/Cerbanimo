import pool from "../db.js";
import { autoGenerateTasks, autoGenerateSubtasks } from "../services/taskGenerator.js";

const getAllTasks = async () => {
  const query = `
    SELECT 
      tasks.id AS task_id,
      tasks.name AS task_name,
      tasks.id,
      skills.category AS skill_category
    FROM tasksa
    JOIN skills ON tasks.skill_id = skills.id;
  `;
  const result = await pool.query(query);
  return result.rows;
};

const getRelevantTasks = async (userSkills) => {
  if (userSkills.length === 0) {
    throw new Error("No skills provided");
  }

  const skillIdQuery = `
    SELECT id, name FROM skills WHERE LOWER(name) = ANY($1)
  `;
  const skillIdResult = await pool.query(skillIdQuery, [
    userSkills.map((skill) => skill.toLowerCase()),
  ]);
  const skillIds = skillIdResult.rows.map((row) => row.id);

  if (skillIds.length === 0) {
    throw new Error("No matching skills found");
  }

  const relevantTasksQuery = `
    SELECT * FROM tasks WHERE skill_id = ANY($1)
  `;
  const relevantTasks = await pool.query(relevantTasksQuery, [skillIds]);

  const taskIds = relevantTasks.rows.map((task) => task.project_id);
  const projectTagsQuery = `
    SELECT id, tags
    FROM projects
    WHERE id = ANY($1)
  `;
  const projectTagsResult = await pool.query(projectTagsQuery, [taskIds]);

  return relevantTasks.rows.map((task) => {
    const projectTags =
      projectTagsResult.rows.find((pt) => pt.id === task.project_id)?.tags ||
      [];
    return { ...task, projectTags };
  });
};

const getProjectRelevantTasks = async (userSkills, projectId) => {
  if (!projectId) {
    throw new Error("Project ID is required");
  }

  const projectTasksQuery = `
    SELECT * FROM tasks WHERE project_id = $1
  `;
  const projectTasksResult = await pool.query(projectTasksQuery, [projectId]);
  const allProjectTasks = projectTasksResult.rows;

  if (userSkills.length === 0) {
    return allProjectTasks.map((task) => ({ ...task, isRelevant: false }));
  }

  const skillIdQuery = `
    SELECT id, name FROM skills WHERE LOWER(name) = ANY($1)
  `;
  const skillIdResult = await pool.query(skillIdQuery, [
    userSkills.map((skill) => skill.toLowerCase()),
  ]);
  const skillIds = skillIdResult.rows.map((row) => row.id);

  const tasksWithRelevance = allProjectTasks.map((task) => ({
    ...task,
    isRelevant: skillIds.includes(task.skill_id),
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
  console.log("Parsed projectId:", parsedProjectId);
  if (isNaN(parsedProjectId)) {
    throw new Error(`Invalid projectId: ${projectId}`);
  }

  console.log(`Fetching tasks for project ID: ${parsedProjectId}`);

  const query = `SELECT * FROM tasks WHERE project_id = $1`;
  const { rows } = await pool.query(query, [parsedProjectId]);
  console.log("Fetched tasks:", rows);
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
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // First get current status
    const statusResult = await client.query(
      "SELECT status FROM tasks WHERE id = $1 FOR UPDATE",
      [taskId]
    );

    if (statusResult.rows.length === 0) {
      throw new Error("Task not found");
    }

    const currentStatus = statusResult.rows[0].status;
    let newStatus = currentStatus;

    // Update status if needed
    if (currentStatus.endsWith("unassigned")) {
      newStatus = currentStatus.replace("unassigned", "assigned");
    }

    // Update task
    const updateQuery = `
      UPDATE tasks 
      SET 
        assigned_user_ids = array_append(assigned_user_ids, $1),
        status = $2
      WHERE id = $3
      RETURNING *;
    `;

    const result = await client.query(updateQuery, [userId, newStatus, taskId]);

    await client.query("COMMIT");
    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const createNewTask = async (
  name,
  description,
  skill_id,
  status,
  projectId,
  reward_tokens = 10,
  dependencies = [],
  skill_level = 0
) => {
  console.log("Creating task with:", {
    name,
    description,
    skill_id,
    status,
    projectId,
    reward_tokens,
    dependencies,
    skill_level,
  });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Fetch project info to check available tokens
    const projectQuery = `
      SELECT token_pool, used_tokens, reserved_tokens
      FROM projects WHERE id = $1 FOR UPDATE;
    `;

    const projectResult = await client.query(projectQuery, [projectId]);

    if (projectResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return { error: "Project not found", status: 404 };
    }

    const {
      token_pool = 250,
      used_tokens = 0,
      reserved_tokens = 0,
    } = projectResult.rows[0];
    console.log("Project token status:", {
      token_pool,
      used_tokens,
      reserved_tokens,
    });

    // Ensure values are properly typed
    const activeBoolean =
      status.startsWith("active") || status.startsWith("urgent");
    const rewardTokens = parseInt(reward_tokens, 10);

    // If task is active, we need to reserve tokens
    let tokenReservation = 0;
    if (activeBoolean) {
      tokenReservation = rewardTokens;

      // Check if we have enough tokens available
      const availableTokens = token_pool - (used_tokens + reserved_tokens);
      if (tokenReservation > availableTokens) {
        await client.query("ROLLBACK");
        return {
          error: `Not enough tokens available. Pool: ${token_pool}, Used: ${used_tokens}, Reserved: ${reserved_tokens}, Available: ${availableTokens}, Needed: ${tokenReservation}`,
          status: 400,
        };
      }

      // Reserve tokens in the project
      await client.query(
        "UPDATE projects SET reserved_tokens = reserved_tokens + $1 WHERE id = $2",
        [tokenReservation, projectId]
      );
      console.log(`Reserved ${tokenReservation} tokens for new task`);
    }

    // Create the task
    const createQuery = `
      INSERT INTO tasks (name, description, skill_id, status, project_id, reward_tokens, dependencies, skill_level)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `;

    const taskResult = await client.query(createQuery, [
      name,
      description,
      skill_id,
      status,
      projectId,
      reward_tokens,
      dependencies,
      skill_level,
    ]);

    await client.query("COMMIT");
    console.log("Task created successfully:", taskResult.rows[0]);
    return taskResult.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Failed to create task:", error);
    return { error: `Failed to create task: ${error.message}`, status: 500 };
  } finally {
    client.release();
  }
};

const updateTask = async (
  name,
  description,
  skill_id,
  status,
  projectId,
  taskId,
  reward_tokens = 10,
  dependencies = [],
  assigned_user_ids,
  skill_level = 0
) => {
  console.log("Controller received:", {
    name,
    description,
    skill_id,
    status,
    projectId,
    taskId,
    reward_tokens,
    dependencies,
    status,
    assigned_user_ids,
    skill_level,
  });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Fetch task & project info with reserved_tokens field
    const dataQuery = `
      SELECT t.reward_tokens AS task_reward, 
             t.status AS task_status, 
             p.token_pool, 
             p.used_tokens,
             p.reserved_tokens
      FROM tasks t
      JOIN projects p ON p.id = $1
      WHERE t.id = $2 FOR UPDATE;
    `;

    const dataResult = await client.query(dataQuery, [projectId, taskId]);

    if (dataResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return { error: "Task or project not found", status: 404 };
    }

    const {
      task_reward,
      task_status,
      token_pool = 250,
      used_tokens = 0,
      reserved_tokens = 0,
    } = dataResult.rows[0];

    console.log("Current values:", {
      task_reward,
      task_status,
      token_pool,
      used_tokens,
      reserved_tokens,
    });

    // Ensure values are properly typed
    const rewardTokens = parseInt(reward_tokens, 10);
    let reservationAdjustment = 0;
    // Calculate token reservation adjustment
const wasActive = task_status.startsWith("active") || task_status.startsWith("urgent");
const isActive = status.startsWith("active") || status.startsWith("urgent");

console.log(`Status change: wasActive=${wasActive}, isActive=${isActive}`);

if (isActive && !wasActive) {
  // Activating task - reserve tokens
  reservationAdjustment = rewardTokens;
  console.log("Activating task, reservation adjustment:", reservationAdjustment);
} else if (!isActive && wasActive) {
  // Deactivating task - release reserved tokens
  reservationAdjustment = -task_reward;
  console.log("Deactivating task, reservation adjustment:", reservationAdjustment);
} else if (isActive && wasActive && (rewardTokens !== task_reward)) {
  // Task remains active but reward amount changed
  reservationAdjustment = rewardTokens - task_reward;
  console.log("Changing active task reward, reservation adjustment:", reservationAdjustment);
}

    // Check if we have enough tokens for a positive adjustment
    const availableTokens = token_pool - (used_tokens + reserved_tokens);
    if (reservationAdjustment > 0 && reservationAdjustment > availableTokens) {
      await client.query("ROLLBACK");
      return {
        error: `Not enough tokens available. Pool: ${token_pool}, Used: ${used_tokens}, Reserved: ${reserved_tokens}, Available: ${availableTokens}, Needed: ${reservationAdjustment}`,
        status: 400,
      };
    }

    // Update task
    const updateQuery = `
      UPDATE tasks 
      SET name = $1, description = $2, skill_id = $3, status = $4, reward_tokens = $5, dependencies = $6, assigned_user_ids = $7, skill_level = $8
      WHERE id = $9 RETURNING *;
    `;

    console.log("Executing update with params:", [
      name,
      description,
      skill_id,
      status,
      rewardTokens,
      dependencies,
      assigned_user_ids,
      skill_level,
      taskId      
    ]);

    const taskResult = await client.query(updateQuery, [
      name,
      description,
      skill_id,
      status,
      rewardTokens,
      dependencies,
      assigned_user_ids,
      skill_level,
      taskId,
    ]);

    // Only update project reserved tokens if there's an adjustment needed
    if (reservationAdjustment !== 0) {
      console.log(
        "Updating project reserved tokens by:",
        reservationAdjustment
      );
      await client.query(
        "UPDATE projects SET reserved_tokens = GREATEST(0, reserved_tokens + $1) WHERE id = $2",
        [reservationAdjustment, projectId]
      );
    }

    await client.query("COMMIT");
    console.log("Update successful:", taskResult.rows[0]);
    return taskResult.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Failed to update task:", error);
    return { error: `Failed to update task: ${error.message}`, status: 500 };
  } finally {
    client.release();
  }
};

// Create task route - optimized
const createTaskRoute = async (req, res) => {
  const {
    name,
    description,
    skill_id,
    status,
    projectId,
    reward_tokens = 10,
    assigned_user_ids = [],
    skill_level = 0,
  } = req.body;

  if (!name || !description || !skill_id || !projectId) {
    return res
      .status(400)
      .json({ error: "Name, description, skill, and project ID are required" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Check token availability in a single query if task is active
    if (active) {
      const projectQuery = await client.query(
        "SELECT token_pool, used_tokens FROM projects WHERE id = $1 FOR UPDATE",
        [projectId]
      );

      if (projectQuery.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "Project not found" });
      }

      const { token_pool = 250, used_tokens = 0 } = projectQuery.rows[0];

      if (used_tokens + reward_tokens > token_pool) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          error: `Not enough tokens available. Pool: ${token_pool}, Used: ${used_tokens}, Needed: ${reward_tokens}`,
        });
      }
    }

    // Insert task and update project in a single transaction
    const insertTaskQuery = `
      INSERT INTO tasks (name, description, skill_id, status, project_id, reward_tokens, used_tokens, assigned_user_ids, skill_level)
      VALUES ($1, $2, $3, $4, $5, $6, COALESCE(used_tokens, 0) + $6, $7, $8)
      RETURNING *;
    `;

    const taskResult = await client.query(insertTaskQuery, [
      name,
      description,
      skill_id,
      status,
      projectId,
      reward_tokens,
      assigned_user_ids,
      skill_level,
    ]);

    // Update project tokens if task is active
    if (status.startsWith("active") || status.startsWith("urgent")) {
      await client.query(
        "UPDATE projects SET used_tokens = used_tokens + $1 WHERE id = $2",
        [reward_tokens, projectId]
      );
    }

    await client.query("COMMIT");
    res.status(201).json(taskResult.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Failed to create task:", error);
    res.status(500).json({ error: "Failed to create task" });
  } finally {
    client.release();
  }
};

// Approve task - efficient implementation
const approveTask = async (taskId, io) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Fetch task details - including assigned_user_ids
    const taskQuery = `
      SELECT reward_tokens, 
             COALESCE(assigned_user_ids, ARRAY[]::integer[]) as assigned_user_ids,
             skill_id, 
             status,
             project_id
      FROM tasks
      WHERE id = $1 FOR UPDATE;
    `;

    const taskResult = await client.query(taskQuery, [taskId]);

    if (taskResult.rows.length === 0) {
      await client.query('ROLLBACK');
      throw new Error('Task not found');
    }

    const { reward_tokens, assigned_user_ids, skill_id, status, project_id } = taskResult.rows[0];


    // Debug: Log the assigned users
    console.log(
      "Assigned users:",
      assigned_user_ids,
      "Type:",
      typeof assigned_user_ids
    );

    // Create notification for each assigned user
    const notificationText = `Your submitted task was approved!`;

    // Only proceed if there are actually assigned users
    if (assigned_user_ids && assigned_user_ids.length > 0) {
      const notificationQuery = `
          INSERT INTO notifications (user_id, message, type, created_at, read) 
          SELECT unnest($1::int[]), $2, $3, NOW(), false
        `;
      await client.query(notificationQuery, [
        assigned_user_ids,
        notificationText,
        "task",
      ]);

      // Socket notification
    if (io && assigned_user_ids.length > 0) {
      console.log('Sending notifications to:', assigned_user_ids);
      
      // Verify room exists before emitting
      const sockets = await io.in(`user_${assigned_user_ids[0]}`).fetchSockets();
      console.log(`Found ${sockets.length} sockets for user ${assigned_user_ids[0]}`);

      assigned_user_ids.forEach(userId => {
        const room = `user_${userId}`;
        console.log(`Emitting to ${room}`);
        io.to(room).emit('notification', {
          id: Date.now(),
          type: 'task-approved',
          message: 'Your task was approved!',
          read: false,
          timestamp: new Date().toISOString()
        });
      });
    }

    }

    if (status !== "submitted") {
      await client.query("ROLLBACK");
      return { error: "Cannot complete an unsubmitted task", status: 400 };
    }

    const rewardPerUser = Math.floor(reward_tokens / assigned_user_ids.length);

    // Fetch the current unlocked_users field from the skills table
    const skillsQuery = `
      SELECT unlocked_users 
      FROM skills 
      WHERE id = $1 FOR UPDATE;
    `;

    const skillsResult = await client.query(skillsQuery, [skill_id]);

    if (skillsResult.rows.length === 0) {
      await client.query("ROLLBACK");
      throw new Error("Skill not found for this task");
    }

    let unlockedUsers = skillsResult.rows[0].unlocked_users || [];
    let updatedUsers = [];

    // Handle case where unlockedUsers is [null]
    if (unlockedUsers.length === 1 && unlockedUsers[0] === null) {
      unlockedUsers = [];
    }

    // Helper function to calculate level from experience
    const calculateLevel = (exp) => {
      // New leveling formula - modify this to match your game design
      // This gives level 1 at 40 exp points
      return Math.floor(Math.sqrt(exp / 40)) + 1;
    };

    for (const userId of assigned_user_ids) {
      let found = false;

      for (let entry of unlockedUsers) {
        let parsedEntry;

        try {
          // Try to parse the entry - it might be a string or already an object
          parsedEntry = typeof entry === "string" ? JSON.parse(entry) : entry;

          // Handle double-stringified JSON (if present)
          if (typeof parsedEntry === "string") {
            parsedEntry = JSON.parse(parsedEntry);
          }

          // If parsedEntry is still a string, it might be in an unexpected format
          if (typeof parsedEntry === "string") {
            // Handle the complex case you showed
            parsedEntry = JSON.parse(
              parsedEntry.replace(/\\"/g, '"').replace(/^"{|}"}$/g, "")
            );
          }
        } catch (err) {
          console.error("Error parsing entry:", err, "Entry:", entry);
          // Skip invalid entries
          continue;
        }

        if (parsedEntry && parsedEntry.user_id === userId) {
          parsedEntry.exp += rewardPerUser;
          parsedEntry.level = calculateLevel(parsedEntry.exp);
          found = true;
          updatedUsers.push(JSON.stringify(parsedEntry));
        } else if (parsedEntry) {
          updatedUsers.push(JSON.stringify(parsedEntry));
        }
      }

      if (!found) {
        const newExp = rewardPerUser;
        updatedUsers.push(
          JSON.stringify({
            exp: newExp,
            level: calculateLevel(newExp),
            user_id: userId,
          })
        );
      }
    }

    // Update the unlocked_users field in the skills table
    const updateSkillsQuery = `
      UPDATE skills 
      SET unlocked_users = $1::jsonb[] 
      WHERE id = $2;
    `;

    await client.query(updateSkillsQuery, [updatedUsers, skill_id]);

    //Query the task to get the project ID
    const taskProjectQuery = `
      SELECT project_id 
      FROM tasks 
      WHERE id = $1;
    `;
    const taskProjectResult = await client.query(taskProjectQuery, [taskId]);

    // Update the projects' token fields
    const updateSpentTokensQuery = `
      UPDATE projects
      SET used_tokens = used_tokens + $1, reserved_tokens = GREATEST(0, reserved_tokens - $1)
      WHERE id = $2;
    `;
    console.log(
      "Updating project with spent tokens:",
      reward_tokens,
      taskProjectResult.rows[0].project_id
    );
    await client.query(updateSpentTokensQuery, [
      reward_tokens,
      taskProjectResult.rows[0].project_id,
    ]);

    // Update cotokens and experience in users table
    const updateUserTokensQuery = `
      UPDATE users 
      SET 
        cotokens = cotokens + $1, 
        experience = array_append(experience, $2) 
      WHERE id = ANY($3);
    `;

    await client.query(updateUserTokensQuery, [
      rewardPerUser,
      taskId.toString(),
      assigned_user_ids,
    ]);

    // Mark task as completed
    await client.query(
      `UPDATE tasks SET submitted = false, status = 'completed', assigned_user_ids = ARRAY[]::integer[] WHERE id = $1`,
      [taskId]
    );

    await client.query("COMMIT");
    return { success: true, message: "Task approved, rewards distributed" };
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Failed to approve task:", error);
    return { error: `Failed to complete task: ${error.message}`, status: 500 };
  } finally {
    client.release();
  }
};

// Function to reset spent points (to be called by a nightly cron job)
const resetAllSpentPoints = async () => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Reset all project tokens
    await client.query(`
      UPDATE projects 
      SET used_tokens = 0
    `);

    await client.query("COMMIT");
    return { success: true, message: "All spent points have been reset" };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Failed to reset spent points:', error);
    return { error: `Failed to reset spent points: ${error.message}`, status: 500 };
  } finally {
    client.release();
  }
};

const submitTask = async (req, res, io) => {
  const { taskId } = req.params;

  try {
    // Step 1: Update the task and get project owner in a single query
    const result = await pool.query(
      `UPDATE tasks t
       SET submitted = TRUE, submitted_at = NOW(), status = 'submitted'
       FROM projects p
       WHERE t.id = $1 AND p.id = t.project_id
       RETURNING t.*, p.name as project_name, p.creator_id as project_owner_id`,
      [taskId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Task not found" });
    }

    const task = result.rows[0];

    // Step 2: Notify the project creator if we have an owner
    if (task.project_owner_id) {
      const notificationText = `A task was submitted for approval in your project "${
        task.project_name || "Untitled"
      }".`;
      const notificationQuery = `
        INSERT INTO notifications (user_id, message, type, created_at, read) 
        VALUES ($1, $2, $3, NOW(), false)
      `;

      await pool.query(notificationQuery, [
        task.project_owner_id,
        notificationText,
        "task",
      ]);

      if (io) {
        // Check if io.to exists before calling it
        if (typeof io.to === "function") {
          console.log(`Emitting notification to user_${task.project_owner_id}`);
          io.to(`user_${task.project_owner_id}`).emit("notification", {
            message: notificationText,
            type: "task",
          });
        } else if (typeof io.emit === "function") {
          // Fallback to broadcast if to() is not available
          io.emit("notification", {
            userId: task.project_owner_id,
            message: notificationText,
            type: "task",
          });
        } else {
          console.warn(
            "Socket.IO instance passed to submitTask is not properly configured"
          );
        }
      }
    }

    res.json({ message: "Task submitted for approval", task });
  } catch (error) {
    console.error("Error submitting task:", error);
    res.status(500).json({ error: "Failed to submit task" });
  }
};

const rejectTask = async (req, res) => {
  const { taskId } = req.params;
  try {
    const result = await pool.query(
      `UPDATE tasks 
           SET submitted = FALSE, status = 'active-assigned'
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
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // First get current status and assignments
    const taskResult = await client.query(
      "SELECT status, assigned_user_ids FROM tasks WHERE id = $1 FOR UPDATE",
      [taskId]
    );

    if (taskResult.rows.length === 0) {
      throw new Error("Task not found");
    }

    const currentStatus = taskResult.rows[0].status;
    const assignedUsers = taskResult.rows[0].assigned_user_ids || [];
    let newStatus = currentStatus;
    console.log(
      "Current status:",
      currentStatus,
      "Assigned users:",
      assignedUsers
    );
    console.log("User ID to drop:", userId);
    // Update status if this was the last assigned user
    const userIdNumber = Number(userId);
    if (assignedUsers.includes(userIdNumber)) {
      console.log(
        "User is assigned to this task, checking for last assignment..."
      );
      const remainingUsers = assignedUsers.filter(
        (id) => Number(id) !== Number(userIdNumber)
      );
      if (remainingUsers.length === 0) {
        console.log(
          "Last assigned user dropping task, updating status to unassigned"
        );
        newStatus = currentStatus.includes("-unassigned")
          ? currentStatus
          : currentStatus.includes("-assigned")
          ? currentStatus.replace("-assigned", "-unassigned")
          : `${currentStatus}-unassigned`;
      }
    }
    console.log("New status:", newStatus);
    // Update task
    const updateQuery = `
      UPDATE tasks 
      SET 
        assigned_user_ids = array_remove(assigned_user_ids, $1),
        status = $2
      WHERE id = $3
      RETURNING *;
    `;

    const result = await client.query(updateQuery, [userId, newStatus, taskId]);

    await client.query("COMMIT");
    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const findById = async (taskId) => {
  const client = await pool.connect();

  try {
    const query = `
      SELECT 
        t.*,
        p.name as project_name
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.id = $1
    `;

    const result = await client.query(query, [taskId]);

    if (result.rows.length === 0) {
      return { error: "Task not found", status: 404 };
    }

    return result.rows[0];
  } catch (error) {
    console.error("Error fetching task details:", error);
    return { error: "Failed to fetch task details", status: 500 };
  } finally {
    client.release();
  }
};

const generateTasks = async (req, res) => {
  const { projectName, projectDescription, interest_tags, creator_id } = req.body;

  if (!projectName || !projectDescription || !interest_tags || !creator_id) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const generatedData = await autoGenerateTasks(projectName, projectDescription, interest_tags, creator_id);
    res.status(200).json(generatedData);
  } catch (error) {
    console.error('Task generation error:', error);
    res.status(500).json({ error: 'Failed to generate tasks' });
  }
};

const granularizeTask = async (req, res) => {
  const { taskId } = req.params;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Fetch original task
    const taskResult = await client.query(
      'SELECT id, project_id, name, description, skill_id, dependencies FROM tasks WHERE id = $1',
      [taskId]
    );
    const task = taskResult.rows[0];

    if (!task) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    // Generate subtasks
    const subtasks = await autoGenerateSubtasks(task.name, task.description, task.skill_id);

    // Delete original task
    await client.query('DELETE FROM tasks WHERE id = $1', [taskId]);

    // Insert new smaller tasks
    const insertPromises = subtasks.map(subtask =>
      client.query(
        `INSERT INTO tasks (project_id, name, description, skill_id, status, dependencies) 
         VALUES ($1, $2, $3, $4, $5, $6::int[]) RETURNING *`,
        [
          task.project_id,
          subtask.name,
          subtask.description,
          subtask.skill_id || task.skill_id,
          'inactive-unassigned',
          Array.isArray(subtask.dependencies) ? subtask.dependencies : []
        ]
      )
    );

    const insertedResults = await Promise.all(insertPromises);
    const insertedSubtasks = insertedResults.map(result => result.rows[0]);

    await client.query('COMMIT');

    res.json({ success: true, deletedTask: task, newTasks: insertedSubtasks });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Granularize task failed:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  } finally {
    client.release();
  }
};

export default {
  granularizeTask,
  generateTasks,
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
  dropTask,
  createTaskRoute,
  resetAllSpentPoints,
  findById,
};
