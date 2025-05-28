import pool from "../db.js";
import {
  autoGenerateTasks,
  autoGenerateSubtasks,
} from "../services/taskGenerator.js";

const getAllTasks = async () => {
  const query = `
    SELECT 
      *
    FROM tasks
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
    const wasActive =
      task_status.startsWith("active") || task_status.startsWith("urgent");
    const isActive = status.startsWith("active") || status.startsWith("urgent");

    console.log(`Status change: wasActive=${wasActive}, isActive=${isActive}`);

    if (isActive && !wasActive) {
      // Activating task - reserve tokens
      reservationAdjustment = rewardTokens;
      console.log(
        "Activating task, reservation adjustment:",
        reservationAdjustment
      );
    } else if (!isActive && wasActive) {
      // Deactivating task - release reserved tokens
      reservationAdjustment = -task_reward;
      console.log(
        "Deactivating task, reservation adjustment:",
        reservationAdjustment
      );
    } else if (isActive && wasActive && rewardTokens !== task_reward) {
      // Task remains active but reward amount changed
      reservationAdjustment = rewardTokens - task_reward;
      console.log(
        "Changing active task reward, reservation adjustment:",
        reservationAdjustment
      );
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
      taskId,
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

const approveTask = async (taskId, io, client) => {
  const localClient = client || (await pool.connect());
  let clientCreated = !client;
  try {
    // Start transaction
    await localClient.query("BEGIN");

    // Fetch task details first (remove FOR UPDATE to avoid deadlock)
    const initialTaskDetails = await localClient.query(
      `
      SELECT id, assigned_user_ids, reflection, proof_of_work_links, skill_id, status, reward_tokens
      FROM tasks WHERE id = $1
    `,
      [taskId]
    );

    const initialTask = initialTaskDetails.rows[0];
    if (!initialTask) {
      await localClient.query("ROLLBACK");
      return { error: "Task not found.", status: 404 };
    }

    if (initialTask.status === "completed") {
      console.warn("Task already completed. Skipping redundant approve call.");
      return { success: true, message: "Task already completed" };
    }

    // Get task tags
    const tagsQuery = await localClient.query(
      `SELECT name FROM skills WHERE id = $1`,
      [initialTask.skill_id]
    );
    const tags = [tagsQuery.rows[0]?.name].filter(Boolean);

    // Store story node data for later use (after transaction)
    const storyNodeData = {
      task_id: initialTask.id,
      user_id: initialTask.assigned_user_ids[0],
      reflection: initialTask.reflection || "",
      media_urls: initialTask.proof_of_work_links,
      tags,
    };

    console.log("task ID:", taskId);
    // No need to rollback and begin a new transaction here; just continue in the same transaction
    console.log("Initial task details:", initialTaskDetails.rows[0]);
    console.log(
      "Status value and type:",
      initialTaskDetails.rows[0].status,
      typeof initialTaskDetails.rows[0].status
    );

    // Check if task is in 'submitted' status before updating
    if (initialTaskDetails.rows[0].status !== "submitted") {
      await localClient.query("ROLLBACK");
      return { error: "Cannot complete an unsubmitted task", status: 400 };
    }

    let updateTask;
    try {
      updateTask = await localClient.query(
        `UPDATE tasks SET status = 'completed' WHERE id = $1 RETURNING id, project_id, assigned_user_ids, status`,
        [taskId]
      );
      if (!updateTask || !updateTask.rows || updateTask.rows.length === 0) {
        console.error("No rows returned from updateTask query");
        await localClient.query("ROLLBACK");
        return { error: "Task not found during update", status: 404 };
      }
      console.log("After update query:", updateTask.rows[0]);
    } catch (err) {
      console.error("Error during updateTask query:", err);
      await localClient.query("ROLLBACK");
      return { error: "Update failed", status: 500 };
    }

    // Flush all pending results to avoid client deadlock
    try {
      await localClient.query("SELECT 1");
    } catch (flushErr) {
      console.error("Error flushing client after update:", flushErr);
    }

    const task = updateTask.rows[0];
    if (!task) {
      await localClient.query("ROLLBACK");
      return { error: "Task not found.", status: 404 };
    }

    // 🧠 Fetch extended task info for XP, notifications, skill leveling, etc.
    const taskQuery = `
      SELECT t.reward_tokens, 
             t.assigned_user_ids,
             t.skill_id, 
             t.status,
             t.project_id,
             p.community_id,
             p.creator_id
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      WHERE t.id = $1;
    `;
    const taskResult = await localClient.query(taskQuery, [taskId]);

    if (taskResult.rows.length === 0) {
      await localClient.query("ROLLBACK");
      return { error: "Task not found", status: 404 };
    }

    const {
      reward_tokens,
      assigned_user_ids,
      skill_id,
      status,
      project_id,
      community_id,
      creator_id,
    } = taskResult.rows[0];

    console.log(
      "Assigned users:",
      assigned_user_ids,
      "Type:",
      typeof assigned_user_ids
    );

    // Add notifications in the database
    const notificationMessage = `Your submitted task was approved!`;
    if (assigned_user_ids && assigned_user_ids.length > 0) {
      const notificationDetails = JSON.stringify({
        text: notificationMessage,
        projectId: project_id,
        taskId: taskId,
      });
      const notificationQuery = `
          INSERT INTO notifications (user_id, message, type, created_at, read) 
          SELECT unnest($1::int[]), $2, $3, NOW(), false
      `;
      await localClient.query(notificationQuery, [
        assigned_user_ids,
        notificationDetails,
        "task",
      ]);
    }

    // 🎓 Calculate rewardPerUser — currently not divided
    const rewardPerUser = reward_tokens;

    // 🎯 XP system and level calculations
    const skillsQuery = `
      SELECT unlocked_users 
      FROM skills 
      WHERE id = $1 FOR UPDATE;
    `;
    const skillsResult = await localClient.query(skillsQuery, [skill_id]);
    if (skillsResult.rows.length === 0) {
      await localClient.query("ROLLBACK");
      return { error: "Skill not found for this task", status: 404 };
    }

    let unlockedUsers = skillsResult.rows[0].unlocked_users || [];
    let updatedUsers = [];

    if (unlockedUsers.length === 1 && unlockedUsers[0] === null) {
      unlockedUsers = [];
    }

    const calculateLevel = (exp) => {
      return Math.floor(Math.sqrt(exp / 40)) + 1;
    };

    for (const userId of assigned_user_ids) {
      let found = false;

      for (let entry of unlockedUsers) {
        let parsedEntry;
        try {
          parsedEntry = typeof entry === "string" ? JSON.parse(entry) : entry;
          if (typeof parsedEntry === "string")
            parsedEntry = JSON.parse(parsedEntry);
          if (typeof parsedEntry === "string") {
            parsedEntry = JSON.parse(
              parsedEntry.replace(/\\"/g, '"').replace(/^"{|}"}$/g, "")
            );
          }
        } catch (err) {
          console.error("Error parsing entry:", err, "Entry:", entry);
          continue;
        }

        if (parsedEntry.user_id === userId) {
          found = true;
          parsedEntry.experience += rewardPerUser;
          parsedEntry.level = calculateLevel(parsedEntry.experience);
          updatedUsers.push(parsedEntry);
        } else {
          updatedUsers.push(parsedEntry);
        }
      }

      if (!found) {
        const newEntry = {
          user_id: userId,
          experience: rewardPerUser,
          level: calculateLevel(rewardPerUser),
        };
        updatedUsers.push(newEntry);
      }
    }

    await localClient.query(
      `UPDATE skills SET unlocked_users = $1 WHERE id = $2`,
      [updatedUsers, skill_id]
    );

    // After level and XP updates are finalized
    for (const user of updatedUsers) {
      const { user_id, experience, level } = user;

      const previousLevel = calculateLevel(experience - rewardPerUser);
      const previousXP = experience - rewardPerUser;
      const newXP = experience;
      const newLevel = level;

      console.log("Emitting levelUpdate for", user_id, {
        previousXP,
        newXP,
        previousLevel,
        newLevel,
      });
      const room = `user_${user_id}`;
      console.log(`Emitting to ${room}`);
      io.to(room).emit("levelUpdate", {
        previousXP,
        newXP,
        previousLevel,
        newLevel,
      });
    }

    // Step 5: Update users with tokens and experience logs
    await localClient.query(
      `
      UPDATE users SET cotokens = cotokens + $1, experience = array_append(experience, $2)
      WHERE id = ANY($3)
    `,
      [rewardPerUser, taskId.toString(), assigned_user_ids]
    );

    // Step 6a: Update token ledgers for assigned users
    const ledgerUpdates = community_id
      ? [
          {
            type: "community",
            id: community_id,
            tokens: reward_tokens,
            creationDate: new Date(),
          },
          {
            type: "project",
            id: project_id,
            tokens: reward_tokens,
            creationDate: new Date(),
          },
        ]
      : [
          {
            type: "project",
            id: project_id,
            tokens: reward_tokens,
            creationDate: new Date(),
          },
        ];

    await localClient.query(
      `
UPDATE users 
SET token_ledger = array_cat(COALESCE(token_ledger, '{}'), $1::jsonb[]) 
WHERE id = ANY($2)
`,
      [ledgerUpdates.map(JSON.stringify), assigned_user_ids]
    );

    // Step 6b: Reward project creator
    console.log("creator_id:", creator_id ? creator_id : "No creator_id found");
    if (creator_id) {
      await localClient.query(
        `UPDATE users SET cotokens = cotokens + 10 WHERE id = $1`,
        [creator_id]
      );

      const creatorLedgerUpdates = [
        {
          type: "project",
          id: project_id,
          tokens: 10,
          creationDate: new Date(),
        },
      ];

      if (community_id) {
        creatorLedgerUpdates.push({
          type: "community",
          id: community_id,
          tokens: 10,
          creationDate: new Date(),
        });
      }

      await localClient.query(
        `UPDATE users 
          SET token_ledger = array_cat(COALESCE(token_ledger, '{}'), $1::jsonb[]) 
          WHERE id = $2`,
        [creatorLedgerUpdates.map(JSON.stringify), creator_id]
      );
    }

    // Step 7: Update project token stats
    await localClient.query(
      `
      UPDATE projects SET used_tokens = used_tokens + $1,
        reserved_tokens = GREATEST(0, reserved_tokens - $1)
      WHERE id = $2
    `,
      [reward_tokens, project_id]
    );

    // Step 8: Notify users
    // This section seems redundant as notifications are already created above.
    // However, if it's intended for a different purpose or audience, it should also be updated.
    // For now, assuming the earlier notification is the primary one.
    // If this is a separate notification, it needs similar JSON stringify treatment.
    // const approveText = `Your submitted task was approved!`;
    // await localClient.query(
    //   `
    //   INSERT INTO notifications (user_id, message, type, created_at, read)
    //   SELECT unnest($1::int[]), $2, 'task', NOW(), false
    // `,
    //   [assigned_user_ids, approveText]
    // );

    // COMMIT the transaction before making external calls
    await localClient.query("COMMIT");

    // After transaction is committed, we can make external HTTP calls
    try {
      console.log("posting story node with tags:", storyNodeData.tags);
      const response = await fetch(
        `http://localhost:4000/storyChronicles/story-node`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(storyNodeData),
        }
      );
      console.log("response.status:", response.status);
      console.log("response text:", await response.text());
    } catch (fetchError) {
      // Log error but don't fail the whole operation
      console.error("Error creating story node:", fetchError);
      // We don't rollback here because the DB transaction is already committed
    }

    // Send socket notifications after transaction is complete
    if (io && assigned_user_ids && assigned_user_ids.length > 0) {
      console.log("Sending notifications to:", assigned_user_ids);
      for (const userId of assigned_user_ids) {
        const room = `user_${userId}`;
        console.log(`Emitting to ${room}`);
        io.to(room).emit("notification", {
          id: Date.now(),
          type: "task-approved",
          message: "Your task was approved!",
          projectId: project_id,
          taskId: taskId,
          read: false,
          timestamp: new Date().toISOString(),
        });
      }
    }

    return { message: "Task approved and reward issued.", status: 200 };
  } catch (error) {
    await localClient.query("ROLLBACK");
    console.error("Error approving task:", error);
    return { error: "Failed to approve task.", status: 500 };
  } finally {
    if (clientCreated) localClient.release();
  }
};

// Function to reset spent points (unchanged)
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
    await client.query("ROLLBACK");
    console.error("Failed to reset spent points:", error);
    return {
      error: `Failed to reset spent points: ${error.message}`,
      status: 500,
    };
  } finally {
    client.release();
  }
};

const submitTask = async (req, res, io) => {
  const { taskId } = req.params;
  // Accept both camelCase and snake_case from frontend
  const proofOfWorkLinks =
    req.body.proofOfWorkLinks || req.body.proof_of_work_links;
  const reflection = req.body.reflection;

  if (
    !proofOfWorkLinks ||
    !Array.isArray(proofOfWorkLinks) ||
    proofOfWorkLinks.length === 0
  ) {
    return res.status(400).json({ error: "Proof of work links are required." });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Helper function to parse the unlocked_users array
    const parseUnlockedUsers = (unlockedUsers) => {
      if (!unlockedUsers || unlockedUsers.length === 0) return [];

      return unlockedUsers
        .map((entry) => {
          try {
            let parsed = typeof entry === "string" ? JSON.parse(entry) : entry;
            if (typeof parsed === "string") {
              parsed = JSON.parse(
                parsed.replace(/\\"/g, '"').replace(/^"{|}"$/g, "")
              );
            }
            return parsed;
          } catch (e) {
            console.error("Error parsing unlocked user entry:", e);
            return null;
          }
        })
        .filter(Boolean);
    };

    // Step 1: Update the task and get project/community info in a single query
    const result = await client.query(
      `UPDATE tasks t
       SET submitted = TRUE, 
       submitted_at = NOW(), 
       status = 'submitted',
       proof_of_work_links = $2,
       reflection = $3
       FROM projects p
       WHERE t.id = $1 AND p.id = t.project_id
       RETURNING t.*, p.name as project_name, p.creator_id as project_owner_id, 
                 p.community_id, t.assigned_user_ids, t.skill_id`,
      [taskId, proofOfWorkLinks || [], reflection || null]
    );

    if (result.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Task not found" });
    }

    const task = result.rows[0];

    // Get skill info including unlocked users
    const skillsQuery = `
      SELECT unlocked_users 
      FROM skills 
      WHERE id = $1;
    `;
    const skillsResult = await client.query(skillsQuery, [task.skill_id]);

    if (skillsResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Skill not found for this task" });
    }

    const unlockedUsers = parseUnlockedUsers(
      skillsResult.rows[0].unlocked_users
    );

    // Filter out submitting users and find eligible reviewers
    const submittingUserIds = task.assigned_user_ids || [];
    const eligibleReviewers = unlockedUsers.filter(
      (user) =>
        !submittingUserIds.includes(user.user_id) &&
        user.user_id !== task.project_owner_id
    );

    // Find level 2+ reviewers
    const highLevelReviewers = eligibleReviewers.filter(
      (user) => user.level >= 2
    );

    let reviewerIds = [];

    // Determine which pool to select from
    if (highLevelReviewers.length >= 3) {
      reviewerIds = [...highLevelReviewers]
        .sort(() => 0.5 - Math.random())
        .slice(0, 3)
        .map((user) => user.user_id);
    } else if (eligibleReviewers.length >= 3) {
      reviewerIds = [...eligibleReviewers]
        .sort(() => 0.5 - Math.random())
        .slice(0, 3)
        .map((user) => user.user_id);
    } else {
      // Get 3 random platform users (excluding creator and submitting users)
      const randomUsersQuery = `
        SELECT id FROM users
        WHERE id NOT IN (
          SELECT unnest($1::integer[]) UNION SELECT $2
        )
        ORDER BY random()
        LIMIT 3;
      `;
      const randomUsersResult = await client.query(randomUsersQuery, [
        submittingUserIds,
        task.project_owner_id,
      ]);
      reviewerIds = randomUsersResult.rows.map((row) => row.id);
    }

    // Update task with reviewer IDs
    await client.query(`UPDATE tasks SET reviewer_ids = $1 WHERE id = $2`, [
      reviewerIds,
      taskId,
    ]);

    // Step 2: Notify the project creator if we have an owner
    if (task.project_owner_id && reviewerIds.length === 0) {
      const notificationMessage = `A task was submitted for approval in your project "${
        task.project_name || "Untitled"
      }".`;
      const notificationDetails = JSON.stringify({
        text: notificationMessage,
        projectId: task.project_id,
        taskId: task.id,
      });

      await client.query(
        `INSERT INTO notifications (user_id, message, type, created_at, read) 
         VALUES ($1, $2, $3, NOW(), false)`,
        [task.project_owner_id, notificationDetails, "task"]
      );

      if (io && typeof io.to === "function") {
        io.to(`user_${task.project_owner_id}`).emit("notification", {
          message: notificationMessage,
          type: "task",
          projectId: task.project_id,
          taskId: task.id,
        });
      }
    }

    // Notify reviewers if we found any
    if (reviewerIds.length > 0) {
      const notificationMessage = `You've been assigned to review a task in project "${
        task.project_name || "Untitled"
      }"`;
      const notificationDetails = JSON.stringify({
        text: notificationMessage,
        projectId: task.project_id,
        taskId: task.id,
      });

      await client.query(
        `INSERT INTO notifications (user_id, message, type, created_at, read) 
         SELECT unnest($1::int[]), $2, $3, NOW(), false`,
        [reviewerIds, notificationDetails, "task"]
      );

      if (io && typeof io.to === "function") {
        reviewerIds.forEach((reviewerId) => {
          io.to(`user_${reviewerId}`).emit("notification", {
            message: notificationMessage,
            type: "task",
            projectId: task.project_id,
            taskId: task.id,
          });
        });
      }
    }

    await client.query("COMMIT");
    // Return the same shape as router expects
    return {
      message: "Task submitted for approval",
      task,
      reviewerIds: reviewerIds.length > 0 ? reviewerIds : null,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error submitting task:", error);
    return res.status(500).json({ error: "Failed to submit task" });
  } finally {
    client.release();
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
    const parsedTaskId = parseInt(taskId, 10);
    if (isNaN(parsedTaskId)) {
      return { error: "Invalid task ID", status: 400 };
    }

    const query = `
      SELECT 
        t.*,
        p.name as project_name
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.id = $1
    `;

    const result = await client.query(query, [parsedTaskId]);

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
  const { projectName, projectDescription, interest_tags, creator_id } =
    req.body;

  if (!projectName || !projectDescription || !interest_tags || !creator_id) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const generatedData = await autoGenerateTasks(
      projectName,
      projectDescription,
      interest_tags,
      creator_id
    );
    res.status(200).json(generatedData);
  } catch (error) {
    console.error("Task generation error:", error);
    res.status(500).json({ error: "Failed to generate tasks" });
  }
};

const granularizeTasks = async (req, res) => {
  const { projectId } = req.body;

  // Define sanitizeSubtasks first
  const sanitizeSubtasks = (tasks, projectId) => {
    let nextId = 1;
    const taskIdToName = {};
    const taskNameToTempId = {};

    tasks.forEach((task) => {
      if (!task.id) {
        task.tempId = nextId++; // Store temp ID separately
      } else {
        task.tempId = task.id;
        nextId = Math.max(nextId, task.id + 1);
      }
      task.project_id = projectId;
      task.reward_tokens = task.reward_tokens ?? 100;
      task.skill_id = task.skill_id ?? null;

      taskIdToName[task.tempId] = task.name;
      taskNameToTempId[task.name] = task.tempId;
    });

    tasks.forEach((task) => {
      if (!Array.isArray(task.dependencies)) {
        task.dependencies = [];
      } else {
        task.dependencies = task.dependencies
          .map((dep) => {
            if (typeof dep === "string") return taskNameToTempId[dep] || null;
            return typeof dep === "number" ? dep : null;
          })
          .filter((dep) => dep !== null);
      }
    });

    return {
      tasks,
      taskIdToName,
    };
  };

  if (!projectId) {
    return res.status(400).json({ success: false, error: "Missing projectId" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Fetch all tasks in the project
    const taskResult = await client.query(
      `SELECT id, project_id, name, description, skill_id, dependencies 
       FROM tasks WHERE project_id = $1`,
      [projectId]
    );
    const tasks = taskResult.rows;

    if (tasks.length === 0) {
      await client.query("ROLLBACK");
      return res
        .status(404)
        .json({ success: false, error: "No tasks found for this project" });
    }

    // Optionally fetch project metadata (optional but helpful for LLM context)
    const projectResult = await client.query(
      `SELECT id, name, description, tags, creator_id FROM projects WHERE id = $1`,
      [projectId]
    );
    const project = projectResult.rows[0];

    // Generate new granular subtasks for ALL tasks at once (batch)
    const inputs = tasks.map((task) => ({
      name: task.name,
      description: task.description,
      skill_id: task.skill_id,
    }));

    const subtasks = await autoGenerateSubtasks(
      inputs,
      project.name,
      project.description,
      project.tags || [],
      project.creator_id
    );

    // Now we can call sanitizeSubtasks since it's defined and we have subtasks
    const { tasks: sanitizedSubtasks, taskIdToName } = sanitizeSubtasks(
      subtasks,
      projectId
    );

    // Delete all original tasks
    await client.query("DELETE FROM tasks WHERE project_id = $1", [projectId]);

    // Step 1: Insert all subtasks without dependencies
    const subtaskMetadata = []; // store name + original dependencies + other info

    sanitizedSubtasks.forEach((subtask) => {
      subtaskMetadata.push({
        projectId: subtask.project_id,
        name: subtask.name,
        description: subtask.description,
        skill_id: subtask.skill_id || null,
        reward_tokens: subtask.reward_tokens ?? 100,
        status: "inactive-unassigned",
        originalDependencies: subtask.dependencies || [],
        dependencyNames: subtask.dependencies
          .map((id) => taskIdToName[id])
          .filter(Boolean),
      });
    });

    // Insert subtasks (no dependencies yet)
    const insertPromises = subtaskMetadata.map((meta) =>
      client.query(
        `INSERT INTO tasks (project_id, name, description, skill_id, status, reward_tokens, dependencies)
         VALUES ($1, $2, $3, $4, $5, $6, $7::int[]) RETURNING id, name`,
        [
          meta.projectId,
          meta.name,
          meta.description,
          meta.skill_id,
          meta.status,
          meta.reward_tokens,
          [], // empty dependencies for now
        ]
      )
    );

    const insertedResults = await Promise.all(insertPromises);

    const nameToRealId = {};
    insertedResults.forEach((result) => {
      const row = result.rows[0];
      nameToRealId[row.name] = row.id;
    });

    // Debug: Log name to real ID mapping
    console.log("Name to Real ID mapping:", nameToRealId);

    const updatePromises = [];
    subtaskMetadata.forEach((meta, index) => {
      const realTaskId = insertedResults[index].rows[0].id;

      // Convert temp IDs to names, then names to real IDs
      const resolvedDeps = meta.originalDependencies
        .map((tempId) => {
          const depName = taskIdToName[tempId];
          return nameToRealId[depName];
        })
        .filter((depId) => depId !== undefined);

      console.log(
        `Resolved dependencies for task "${meta.name}" (ID: ${realTaskId}):`,
        resolvedDeps
      );

      updatePromises.push(
        client.query(
          `UPDATE tasks SET dependencies = $1::int[] WHERE id = $2`,
          [resolvedDeps, realTaskId]
        )
      );
    });

    await Promise.all(updatePromises);

    // Log the results of the subtasks inserted
    const insertedSubtasks = insertedResults.map((result) => result.rows[0]);

    await client.query("COMMIT");

    res.json({
      success: true,
      project: project || { id: projectId },
      deletedTasks: tasks,
      newTasks: insertedSubtasks,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Granularize project tasks failed:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  } finally {
    client.release();
  }
};

// Process review function
const processReview = async (taskId, userId, action, io) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Get task details including current approvals/rejections
    const taskQuery = `
      SELECT reviewer_ids, approvals, rejections, status, reward_tokens, project_id
      FROM tasks
      WHERE id = $1 FOR UPDATE;
    `;
    const taskResult = await client.query(taskQuery, [taskId]);

    if (taskResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return { error: "Task not found", status: 404 };
    }

    const {
      reviewer_ids,
      approvals,
      rejections,
      status,
      reward_tokens,
      project_id,
    } = taskResult.rows[0];

    // Check if user is a reviewer
    if (!reviewer_ids.includes(userId)) {
      await client.query("ROLLBACK");
      return { error: "User not authorized to review this task", status: 403 };
    }

    // Check if task is still in submitted status
    if (status !== "submitted") {
      await client.query("ROLLBACK");
      return { error: "Task is not in review status", status: 400 };
    }

    // Update reviewer arrays based on action
    const updateQuery = `
      UPDATE tasks
      SET ${
        action === "approve"
          ? "approvals = array_append(approvals, $2)"
          : "rejections = array_append(rejections, $2)"
      }
      WHERE id = $1
      RETURNING approvals, rejections;
    `;
    // Pass userId as $2 so the user's id is appended
    const updateResult = await client.query(updateQuery, [taskId, userId]);
    const newApprovals = updateResult.rows[0].approvals;
    const newRejections = updateResult.rows[0].rejections;
    console.log("New approvals:", newApprovals);
    console.log("New rejections:", newRejections);

    // Check if we've reached consensus (2 or more approvals/rejections)
    if (newApprovals?.length >= 2 || newRejections?.length >= 2) {
      const finalAction = newApprovals?.length >= 2 ? "approve" : "reject";

      if (finalAction === "approve") {
        // Approve the task
        const currentStatusResult = await client.query(
          `SELECT status FROM tasks WHERE id = $1`,
          [taskId]
        );
        if (currentStatusResult.rows[0].status !== "submitted") {
          return { success: true, message: "Task already processed" };
        }

        const approveResult = await approveTask(taskId, io, client);
        if (approveResult.error) {
          await client.query("ROLLBACK");
          return approveResult;
        }
      } else {
        // Reject the task - return to assigned users
        const rejectQuery = `
          UPDATE tasks
          SET status = 'active-assigned',
              submitted = false,
              reviewer_ids = ARRAY[]::integer[],
              approvals = ARRAY[]::integer[],
              rejections = ARRAY[]::integer[]
          WHERE id = $1
          RETURNING assigned_user_ids;
        `;
        const rejectResult = await client.query(rejectQuery, [taskId]);
        const assignedUserIds = rejectResult.rows[0].assigned_user_ids;

        // Notify assigned users
        if (assignedUserIds && assignedUserIds.length > 0) {
          const notificationMessage = `Your submitted task was rejected and needs revisions.`;
          // project_id is available from the taskResult destructuring earlier in processReview
          // taskId is a parameter of processReview
          const notificationDetails = JSON.stringify({
            text: notificationMessage,
            projectId: project_id, // This was destructured from taskResult.rows[0]
            taskId: taskId,       // This is the function parameter
          });
          await client.query(
            `
            INSERT INTO notifications (user_id, message, type, created_at, read) 
            SELECT unnest($1::int[]), $2, $3, NOW(), false
          `,
            [assignedUserIds, notificationDetails, "task"]
          );

          // Socket notifications
          if (io) {
            assignedUserIds.forEach((uId) => { // Renamed userId to uId to avoid conflict with outer scope userId
              io.to(`user_${uId}`).emit("notification", {
                id: Date.now(),
                type: "task",
                message: "Your task was rejected and needs revisions",
                projectId: project_id, // This was destructured from taskResult.rows[0]
                taskId: taskId,       // This is the function parameter
                read: false,
                timestamp: new Date().toISOString(),
              });
            });
          }
        }
      }
    }

    await client.query("COMMIT");
    return {
      success: true,
      action,
      approvals: newApprovals,
      rejections: newRejections,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error processing review:", error);
    return { error: error.message, status: 500 };
  } finally {
    client.release();
  }
};

// Function to get tasks the user is a reviewer for
const getReviewerTasks = async (userId) => {
  const client = await pool.connect();
  const userIdNumber = Number(userId);
  try {
    const query = `
      SELECT t.*, p.name as project_name
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      WHERE $1::int = ANY(t.reviewer_ids)
    `;

    const result = await client.query(query, [userIdNumber]);

    if (result.rows.length === 0) {
      console.log("No tasks found for this reviewer");
      return [];
    }

    return result.rows;
  } catch (error) {
    console.error("Error fetching reviewer tasks:", error);
    return { error: "Failed to fetch reviewer tasks", status: 500 };
  } finally {
    client.release();
  }
};

export default {
  getReviewerTasks,
  processReview,
  granularizeTasks,
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
