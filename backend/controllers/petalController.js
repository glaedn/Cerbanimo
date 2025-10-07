import pool from "../db.js";
import {
  autoGeneratePetals,
  autoGenerateSubpetals,
} from "../services/petalGenerator.js";

const getAllPetals = async () => {
  const query = `
    SELECT 
      petals.*,
      skills.name as skill_name
    FROM petals
    JOIN skills ON petals.skill_id = skills.id;
  `;
  const result = await pool.query(query);
  return result.rows;
};

const getRelevantPetals = async (userSkills) => {
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

  const relevantPetalsQuery = `
    SELECT * FROM petals WHERE skill_id = ANY($1)
  `;
  const relevantPetals = await pool.query(relevantPetalsQuery, [skillIds]);

  const petalIds = relevantPetals.rows.map((petal) => petal.project_id);
  const projectTagsQuery = `
    SELECT id, tags
    FROM projects
    WHERE id = ANY($1)
  `;
  const projectTagsResult = await pool.query(projectTagsQuery, [petalIds]);

  return relevantPetals.rows.map((petal) => {
    const projectTags =
      projectTagsResult.rows.find((pt) => pt.id === petal.project_id)?.tags ||
      [];
    return { ...petal, projectTags };
  });
};

const getProjectRelevantPetals = async (userSkills, projectId) => {
  if (!projectId) {
    throw new Error("Project ID is required");
  }

  const projectPetalsQuery = `
    SELECT * FROM petals WHERE project_id = $1
  `;
  const projectPetalsResult = await pool.query(projectPetalsQuery, [projectId]);
  const allProjectPetals = projectPetalsResult.rows;

  if (userSkills.length === 0) {
    return allProjectPetals.map((petal) => ({ ...petal, isRelevant: false }));
  }

  const skillIdQuery = `
    SELECT id, name FROM skills WHERE LOWER(name) = ANY($1)
  `;
  const skillIdResult = await pool.query(skillIdQuery, [
    userSkills.map((skill) => skill.toLowerCase()),
  ]);
  const skillIds = skillIdResult.rows.map((row) => row.id);

  const petalsWithRelevance = allProjectPetals.map((petal) => ({
    ...petal,
    isRelevant: skillIds.includes(petal.skill_id),
  }));

  petalsWithRelevance.sort((a, b) => b.isRelevant - a.isRelevant);
  return petalsWithRelevance;
};

const getPlanetSpecificPetals = async (skillName) => {
  const query = `
    SELECT t.id AS petal_id, t.name AS petal_name, t.project_id, p.name AS project_name
    FROM petals t
    JOIN skills s ON t.skill_id = s.id
    JOIN projects p ON t.project_id = p.id
    WHERE LOWER(s.name) = LOWER($1) AND t.active_ind = 1
  `;
  const result = await pool.query(query, [skillName]);
  return result.rows;
};

// Fetch petals for a specific project
const getPetalsByProjectId = async (projectId) => {
  const parsedProjectId = parseInt(projectId, 10);
  console.log("Parsed projectId:", parsedProjectId);
  if (isNaN(parsedProjectId)) {
    throw new Error(`Invalid projectId: ${projectId}`);
  }

  console.log(`Fetching petals for project ID: ${parsedProjectId}`);

  const query = `SELECT * FROM petals WHERE project_id = $1`;
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

const acceptPetal = async (petalId, userId) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // First get current status
    const statusResult = await client.query(
      "SELECT status FROM petals WHERE id = $1 FOR UPDATE",
      [petalId]
    );

    if (statusResult.rows.length === 0) {
      throw new Error("Petal not found");
    }

    const currentStatus = statusResult.rows[0].status;
    let newStatus = currentStatus;

    // Update status if needed
    if (currentStatus.endsWith("unassigned")) {
      newStatus = currentStatus.replace("unassigned", "assigned");
    }

    // Update petal
    const updateQuery = `
      UPDATE petals
      SET 
        assigned_user_ids = array_append(assigned_user_ids, $1),
        status = $2
      WHERE id = $3
      RETURNING *;
    `;

    const result = await client.query(updateQuery, [userId, newStatus, petalId]);

    await client.query("COMMIT");
    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const createNewPetal = async (
  name,
  description,
  skill_id,
  status,
  projectId,
  reward_tokens = 10,
  dependencies = [],
  skill_level = 0
) => {
  console.log("Creating petal with:", {
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

    // If petal is active, we need to reserve tokens
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
      console.log(`Reserved ${tokenReservation} tokens for new petal`);
    }

    // Create the petal
    const createQuery = `
      INSERT INTO petals (name, description, skill_id, status, project_id, reward_tokens, dependencies, skill_level)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `;

    const petalResult = await client.query(createQuery, [
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
    console.log("Petal created successfully:", petalResult.rows[0]);
    return petalResult.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Failed to create petal:", error);
    return { error: `Failed to create petal: ${error.message}`, status: 500 };
  } finally {
    client.release();
  }
};

const updatePetal = async (
  name,
  description,
  skill_id,
  status,
  projectId,
  petalId,
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
    petalId,
    reward_tokens,
    dependencies,
    status,
    assigned_user_ids,
    skill_level,
  });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Fetch petal & project info with reserved_tokens field
    const dataQuery = `
      SELECT t.reward_tokens AS petal_reward,
             t.status AS petal_status,
             p.token_pool, 
             p.used_tokens,
             p.reserved_tokens
      FROM petals t
      JOIN projects p ON p.id = $1
      WHERE t.id = $2 FOR UPDATE;
    `;

    const dataResult = await client.query(dataQuery, [projectId, petalId]);

    if (dataResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return { error: "Petal or project not found", status: 404 };
    }

    const {
      petal_reward,
      petal_status,
      token_pool = 250,
      used_tokens = 0,
      reserved_tokens = 0,
    } = dataResult.rows[0];

    // Check if the petal is already completed
    if (petal_status === "completed") {
      await client.query("ROLLBACK");
      // client.release() will be called in the finally block
      return { error: "Completed petals cannot be modified.", status: 403 };
    }

    console.log("Current values:", {
      petal_reward,
      petal_status,
      token_pool,
      used_tokens,
      reserved_tokens,
    });

    // Ensure values are properly typed
    const rewardTokens = parseInt(reward_tokens, 10);
    let reservationAdjustment = 0;
    // Calculate token reservation adjustment
    const wasActive =
      petal_status.startsWith("active") || petal_status.startsWith("urgent");
    const isActive = status.startsWith("active") || status.startsWith("urgent");

    console.log(`Status change: wasActive=${wasActive}, isActive=${isActive}`);

    if (isActive && !wasActive) {
      // Activating petal - reserve tokens
      reservationAdjustment = rewardTokens;
      console.log(
        "Activating petal, reservation adjustment:",
        reservationAdjustment
      );
    } else if (!isActive && wasActive) {
      // Deactivating petal - release reserved tokens
      reservationAdjustment = -petal_reward;
      console.log(
        "Deactivating petal, reservation adjustment:",
        reservationAdjustment
      );
    } else if (isActive && wasActive && rewardTokens !== petal_reward) {
      // Petal remains active but reward amount changed
      reservationAdjustment = rewardTokens - petal_reward;
      console.log(
        "Changing active petal reward, reservation adjustment:",
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

    // Update petal
    const updateQuery = `
      UPDATE petals
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
      petalId,
    ]);

    const petalResult = await client.query(updateQuery, [
      name,
      description,
      skill_id,
      status,
      rewardTokens,
      dependencies,
      assigned_user_ids,
      skill_level,
      petalId,
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
    console.log("Update successful:", petalResult.rows[0]);
    return petalResult.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Failed to update petal:", error);
    return { error: `Failed to update petal: ${error.message}`, status: 500 };
  } finally {
    client.release();
  }
};

// Create petal route - optimized
const createPetalRoute = async (req, res) => {
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

    // Check token availability in a single query if petal is active
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

    // Insert petal and update project in a single transaction
    const insertPetalQuery = `
      INSERT INTO petals (name, description, skill_id, status, project_id, reward_tokens, used_tokens, assigned_user_ids, skill_level)
      VALUES ($1, $2, $3, $4, $5, $6, COALESCE(used_tokens, 0) + $6, $7, $8)
      RETURNING *;
    `;

    const petalResult = await client.query(insertPetalQuery, [
      name,
      description,
      skill_id,
      status,
      projectId,
      reward_tokens,
      assigned_user_ids,
      skill_level,
    ]);

    // Update project tokens if petal is active
    if (status.startsWith("active") || status.startsWith("urgent")) {
      await client.query(
        "UPDATE projects SET used_tokens = used_tokens + $1 WHERE id = $2",
        [reward_tokens, projectId]
      );
    }

    await client.query("COMMIT");
    res.status(201).json(petalResult.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Failed to create petal:", error);
    res.status(500).json({ error: "Failed to create petal" });
  } finally {
    client.release();
  }
};

const approvePetal = async (petalId, io, client) => {
  const localClient = client || (await pool.connect());
  let clientCreated = !client;
  try {
    // Start transaction
    await localClient.query("BEGIN");

    // Fetch petal details first (remove FOR UPDATE to avoid deadlock)
    const initialPetalDetails = await localClient.query(
      `
      SELECT id, assigned_user_ids, reflection, proof_of_work_links, skill_id, status, reward_tokens, submitted_by
      FROM petals WHERE id = $1
    `,
      [petalId]
    );

    const initialPetal = initialPetalDetails.rows[0];
    if (!initialPetal) {
      await localClient.query("ROLLBACK");
      return { error: "Petal not found.", status: 404 };
    }

    if (initialPetal.status === "completed") {
      console.warn("Petal already completed. Skipping redundant approve call.");
      return { success: true, message: "Petal already completed" };
    }

    // Get petal tags
    const tagsQuery = await localClient.query(
      `SELECT name FROM skills WHERE id = $1`,
      [initialPetal.skill_id]
    );
    const tags = [tagsQuery.rows[0]?.name].filter(Boolean);

    // Story node data will be prepared and used conditionally later, after COMMIT.
    // We need 'tags' and 'initialPetal' (which includes submitted_by, reflection, proof_of_work_links)
    // 'tags' is already fetched from initialPetal.skill_id.

    console.log("petal ID:", petalId);
    // No need to rollback and begin a new transaction here; just continue in the same transaction
    console.log("Initial petal details:", initialPetalDetails.rows[0]);
    console.log(
      "Status value and type:",
      initialPetalDetails.rows[0].status,
      typeof initialPetalDetails.rows[0].status
    );

    // Check if petal is in 'submitted' status before updating
    if (initialPetalDetails.rows[0].status !== "submitted") {
      await localClient.query("ROLLBACK");
      return { error: "Cannot complete an unsubmitted petal", status: 400 };
    }

    let updatePetal;
    try {
      updatePetal = await localClient.query(
        `UPDATE petals SET status = 'completed' WHERE id = $1 RETURNING id, project_id, assigned_user_ids, status`,
        [petalId]
      );
      if (!updatePetal || !updatePetal.rows || updatePetal.rows.length === 0) {
        console.error("No rows returned from updatePetal query");
        await localClient.query("ROLLBACK");
        return { error: "Petal not found during update", status: 404 };
      }
      console.log("After update query:", updatePetal.rows[0]);
    } catch (err) {
      console.error("Error during updatePetal query:", err);
      await localClient.query("ROLLBACK");
      return { error: "Update failed", status: 500 };
    }

    // Flush all pending results to avoid client deadlock
    try {
      await localClient.query("SELECT 1");
    } catch (flushErr) {
      console.error("Error flushing client after update:", flushErr);
    }

    const petal = updatePetal.rows[0];
    if (!petal) {
      await localClient.query("ROLLBACK");
      return { error: "Petal not found.", status: 404 };
    }

    // 🧠 Fetch extended petal info for XP, notifications, skill leveling, etc.
    const petalQuery = `
      SELECT t.reward_tokens, 
             t.assigned_user_ids,
             t.submitted_by,
             t.skill_id, 
             t.status,
             t.project_id,
             p.community_id,
             p.creator_id
      FROM petals t
      JOIN projects p ON t.project_id = p.id
      WHERE t.id = $1;
    `;
    const petalResult = await localClient.query(petalQuery, [petalId]);

    if (petalResult.rows.length === 0) {
      await localClient.query("ROLLBACK");
      return { error: "Petal not found", status: 404 };
    }

    const {
      reward_tokens,
      assigned_user_ids,
      submitted_by,
      skill_id,
      status,
      project_id,
      community_id,
      creator_id,
    } = petalResult.rows[0];

    // Fetch skill name
    const skillNameQuery = await localClient.query(
      `SELECT name FROM skills WHERE id = $1`,
      [skill_id]
    );
    const skillName = skillNameQuery.rows[0]?.name || "Unknown Skill";
    console.log("Fetched skillName:", skillName);

    console.log(
      "Assigned users:",
      assigned_user_ids,
      "Type:",
      typeof assigned_user_ids
    );

    // Add notifications in the database
    const notificationMessage = `Your unfurled petal was approved!`;
    if (assigned_user_ids && assigned_user_ids.length > 0) {
      const notificationDetails = JSON.stringify({
        text: notificationMessage,
        projectId: project_id,
        petalId: petalId,
      });
      const notificationQuery = `
          INSERT INTO notifications (user_id, message, type, created_at, read) 
          SELECT unnest($1::int[]), $2, $3, NOW(), false
      `;
      await localClient.query(notificationQuery, [
        assigned_user_ids,
        notificationDetails,
        "petal",
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
      return { error: "Skill not found for this petal", status: 404 };
    }

    let rawUnlockedUsers = skillsResult.rows[0].unlocked_users || [];
    console.log("Initial raw unlockedUsers from DB:", JSON.stringify(rawUnlockedUsers));

    const calculateLevel = (exp) => {
      return Math.floor(Math.sqrt(exp / 40)) + 1;
    };

    let parsedSkillEntries = [];
    if (Array.isArray(rawUnlockedUsers)) {
        for (const entry of rawUnlockedUsers) {
            if (entry === null && rawUnlockedUsers.length === 1) continue; // Skip if it's a single null entry placeholder
            console.log("Parsing raw entry:", entry, "type:", typeof entry);
            let parsedEntry;
            try {
                if (typeof entry === 'string') {
                    try {
                        parsedEntry = JSON.parse(entry);
                    } catch (e1) {
                        console.log("Simple JSON.parse failed for entry, trying replacement parse. Error:", e1.message, "Entry:", entry);
                        parsedEntry = JSON.parse(entry.replace(/\\"/g, '"').replace(/^"{|}"}$/g, ""));
                    }
                } else {
                    parsedEntry = entry; // Assume it's already an object
                }
                if (parsedEntry && typeof parsedEntry.user_id !== 'undefined') { // Basic validation
                    parsedSkillEntries.push(parsedEntry);
                } else {
                    console.error("Parsed entry is invalid or missing user_id:", parsedEntry, "Original entry:", entry);
                }
            } catch (err) {
                console.error("Error parsing entry for DB:", entry, "Error:", err.message);
                // Decide if to keep unparseable but potentially valid non-JSON string entries, or skip.
                // For now, skipping if it's meant to be JSON and fails. If it could be a simple user_id string, handle differently.
            }
        }
    }
    console.log("Initial parsedSkillEntries:", JSON.stringify(parsedSkillEntries));

    const skillEntryMap = new Map(parsedSkillEntries.map(entry => [entry.user_id, entry]));
    console.log("Created skillEntryMap:", JSON.stringify(Array.from(skillEntryMap.entries())));

    for (const userId of assigned_user_ids) {
      let previousXP = 0, previousLevel = 1, newXP = 0, newLevel = 1; // Default for new users

      const existingEntry = skillEntryMap.get(userId);
      console.log("For userId:", userId, "existingEntry found in map:", !!existingEntry);

      if (existingEntry) {
        previousXP = existingEntry.exp;
        previousLevel = existingEntry.level;

        existingEntry.exp += rewardPerUser;
        existingEntry.level = calculateLevel(existingEntry.exp);

        newXP = existingEntry.exp;
        newLevel = existingEntry.level;

        skillEntryMap.set(userId, existingEntry); // Update the map
        console.log("Updated existingEntry for userId:", userId, { previousXP, previousLevel, newXP, newLevel, updatedData: existingEntry });
      } else {
        // New user for this skill
        newXP = rewardPerUser;
        newLevel = calculateLevel(rewardPerUser);
        // previousXP and previousLevel remain 0 and 1 respectively as initialized
        const newSkillEntry = { user_id: userId, exp: newXP, level: newLevel };
        skillEntryMap.set(userId, newSkillEntry); // Add the new entry to the map
        console.log("Created newSkillEntry for userId:", userId, { previousXP, previousLevel, newXP, newLevel, entryData: newSkillEntry });
      }

      if (!skillName) { // skillName is fetched once before this loop
          console.error("skillName is undefined before emitting socket event for userId:", userId);
      }

      const room = `user_${userId}`;
      console.log("Emitting levelUpdate to room:", room, "for userId:", userId, "with payload:", { previousXP, newXP, previousLevel, newLevel, skillName });
      io.to(room).emit("levelUpdate", { previousXP, newXP, previousLevel, newLevel, skillName });
    }

    const finalUpdatedSkillEntries = Array.from(skillEntryMap.values());
    console.log("Final finalUpdatedSkillEntries for DB update:", JSON.stringify(finalUpdatedSkillEntries));

    await localClient.query(
      `UPDATE skills SET unlocked_users = $1 WHERE id = $2`,
      [finalUpdatedSkillEntries, skill_id]
    );

    // Step 5: Update user experience
    if (assigned_user_ids && assigned_user_ids.length > 0) {
      await localClient.query(
        `UPDATE users SET experience = array_append(COALESCE(experience, '{}'), $1)
         WHERE id = ANY($2)`,
        [petalId.toString(), assigned_user_ids]
      );
    }

    // Step 6: Differential cotoken and token_ledger updates
    const main_reward = reward_tokens;
    const bonus_reward = Math.ceil(reward_tokens / 10);

    // Update cotokens and token_ledger for submitted_by user
    if (submitted_by) {
      await localClient.query(
        `UPDATE users SET cotokens = cotokens + $1 WHERE id = $2`,
        [main_reward, submitted_by]
      );
      const submitterLedgerEntries = [
        { type: "petal_completion_reward", petalId: petalId, tokens: main_reward, creationDate: new Date(), projectId: project_id }
      ];
      if (community_id) {
        submitterLedgerEntries.push({ type: "community_petal_reward", communityId: community_id, petalId: petalId, tokens: main_reward, creationDate: new Date() });
      }
      await localClient.query(
        `UPDATE users SET token_ledger = array_cat(COALESCE(token_ledger, '{}'), $1::jsonb[]) WHERE id = $2`,
        [submitterLedgerEntries.map(JSON.stringify), submitted_by]
      );
    }

    // Update cotokens and token_ledger for other assigned users
    if (assigned_user_ids && assigned_user_ids.length > 0) {
      for (const userId of assigned_user_ids) {
        if (userId === submitted_by) continue; // Skip the main submitter, already handled

        await localClient.query(
          `UPDATE users SET cotokens = cotokens + $1 WHERE id = $2`,
          [bonus_reward, userId]
        );
        const bonusLedgerEntries = [
          { type: "petal_completion_bonus", petalId: petalId, tokens: bonus_reward, creationDate: new Date(), projectId: project_id }
        ];
        if (community_id) {
          bonusLedgerEntries.push({ type: "community_petal_bonus", communityId: community_id, petalId: petalId, tokens: bonus_reward, creationDate: new Date() });
        }
        await localClient.query(
          `UPDATE users SET token_ledger = array_cat(COALESCE(token_ledger, '{}'), $1::jsonb[]) WHERE id = $2`,
          [bonusLedgerEntries.map(JSON.stringify), userId]
        );
      }
    }

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
    // const approveText = `Your unfurled petal was approved!`;
    // await localClient.query(
    //   `
    //   INSERT INTO notifications (user_id, message, type, created_at, read)
    //   SELECT unnest($1::int[]), $2, 'petal', NOW(), false
    // `,
    //   [assigned_user_ids, approveText]
    // );

    // COMMIT the transaction before making external calls
    await localClient.query("COMMIT");

    // After transaction is committed, conditionally create story node
    if (initialPetal && initialPetal.submitted_by) {
      const storyNodeData = {
        petal_id: initialPetal.id,
        user_id: initialPetal.submitted_by, // Strictly use submitted_by
        reflection: initialPetal.reflection || "",
        media_urls: initialPetal.proof_of_work_links || [],
        tags: tags, // 'tags' was fetched earlier based on initialPetal.skill_id
      };
      try {
        console.log("Posting story node for submitted_by user:", initialPetal.submitted_by, "with data:", storyNodeData);
        const response = await fetch(
          `${process.env.BACKEND_URL}/storyChronicles/story-node`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(storyNodeData),
          }
        );
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Error creating story node: ${response.status} ${response.statusText}`, errorText);
        } else {
            console.log("Story node creation request successful for user:", initialPetal.submitted_by, "status:", response.status);
        }
      } catch (fetchError) {
        console.error("Fetch error creating story node:", fetchError);
      }
    } else {
      console.warn(`Skipping story node creation for petal ${petalId} as submitted_by user is not defined or initialPetal is missing.`);
    }

    // Send socket notifications after transaction is complete
    if (io && assigned_user_ids && assigned_user_ids.length > 0) {
      console.log("Sending notifications to:", assigned_user_ids);
      for (const userId of assigned_user_ids) {
        const room = `user_${userId}`;
        console.log(`Emitting to ${room}`);
        io.to(room).emit("notification", {
          id: Date.now(),
          type: "petal-approved",
          message: "Your petal was approved!",
          projectId: project_id,
          petalId: petalId,
          read: false,
          timestamp: new Date().toISOString(),
        });
      }
    }

    return { message: "Petal approved and reward issued.", status: 200 };
  } catch (error) {
    await localClient.query("ROLLBACK");
    console.error("Error approving petal:", error);
    return { error: "Failed to approve petal.", status: 500 };
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

const submitPetal = async (req, res, io) => {
  const { petalId } = req.params;
  // Accept both camelCase and snake_case from frontend
  const proofOfWorkLinks =
    req.body.proofOfWorkLinks || req.body.proof_of_work_links;
  const reflection = req.body.reflection;
  const platformUserId = req.body.platformUserId;

  if (!platformUserId) {
    // This function is called by a route handler, so it should return an error object.
    // The route handler will then send the actual HTTP response.
    // Note: The original code was calling res.status().json() directly.
    // This is a change in pattern to allow the route handler to manage the response.
    return { error: "Platform User ID is required for submission.", status: 400 };
  }

  if (
    !proofOfWorkLinks ||
    !Array.isArray(proofOfWorkLinks) ||
    proofOfWorkLinks.length === 0
  ) {
    // Similarly, return an error object for the route handler.
    return { error: "Proof of work links are required.", status: 400 };
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

    // Step 1: Update the petal and get project/community info in a single query
    const result = await client.query(
      `UPDATE petals t
       SET submitted = TRUE,
       submitted_at = NOW(),
       status = 'submitted',
       peer_review_deadline = NOW() + INTERVAL '6 hours',
       proof_of_work_links = $2,
       reflection = $3,
       submitted_by = $4
       FROM projects p
       WHERE t.id = $1 AND p.id = t.project_id
       RETURNING t.*, p.name as project_name, p.creator_id as project_owner_id,
                 p.community_id, t.assigned_user_ids, t.skill_id, t.submitted_by`,
      [petalId, proofOfWorkLinks || [], reflection || null, platformUserId]
    );

    if (result.rowCount === 0) {
      await client.query("ROLLBACK");
      // Return error object for the route handler
      return { error: "Petal not found or project mismatch.", status: 404 };
    }

    const petal = result.rows[0];

    // Get skill info including unlocked users
    const skillsQuery = `
      SELECT unlocked_users 
      FROM skills 
      WHERE id = $1;
    `;
    const skillsResult = await client.query(skillsQuery, [petal.skill_id]);

    if (skillsResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Skill not found for this petal" });
    }

    const unlockedUsers = parseUnlockedUsers(
      skillsResult.rows[0].unlocked_users
    );

    // Filter out submitting users and find eligible reviewers
    const submittingUserIds = petal.assigned_user_ids || [];
    const eligibleReviewers = unlockedUsers.filter(
      (user) =>
        !submittingUserIds.includes(user.user_id) &&
        user.user_id !== petal.project_owner_id
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
        petal.project_owner_id,
      ]);
      reviewerIds = randomUsersResult.rows.map((row) => row.id);
    }

    // Update petal with reviewer IDs
    await client.query(`UPDATE petals SET reviewer_ids = $1 WHERE id = $2`, [
      reviewerIds,
      petalId,
    ]);

    // Step 2: Notify the project creator if we have an owner
    if (petal.project_owner_id) {
      const notificationMessage = `A petal has been submitted for peer review in your project "${
        petal.project_name || "Untitled"
      }".`;
      const notificationDetails = JSON.stringify({
        text: notificationMessage,
        projectId: petal.project_id,
        petalId: petalId,
      });

      await client.query(
        `INSERT INTO notifications (user_id, message, type, created_at, read) 
         VALUES ($1, $2, $3, NOW(), false)`,
        [petal.project_owner_id, notificationDetails, "petal"]
      );

      if (io && typeof io.to === "function") {
        io.to(`user_${petal.project_owner_id}`).emit("notification", {
          message: notificationMessage,
          type: "petal",
          projectId: petal.project_id,
          petalId: petal.id,
        });
      }
    }

    // Notify reviewers if we found any
    if (reviewerIds.length > 0) {
      const notificationMessage = `You've been assigned to review a petal in project "${
        petal.project_name || "Untitled"
      }"`;
      const notificationDetails = JSON.stringify({
        text: notificationMessage,
        projectId: petal.project_id,
        petalId: petal.id,
      });
      console.log(
        "Inserting notifications for reviewers:",
        reviewerIds,
        notificationDetails
      );

      await client.query(
        `INSERT INTO notifications (user_id, message, type, created_at, read) 
         SELECT unnest($1::int[]), $2, $3, NOW(), false`,
        [reviewerIds, notificationDetails, "petal"]
      );

      if (io && typeof io.to === "function") {
        reviewerIds.forEach((reviewerId) => {
          io.to(`user_${reviewerId}`).emit("notification", {
            message: notificationMessage,
            type: "petal",
            projectId: petal.project_id,
            petalId: petalId,
          });
        });
      }
    }

    await client.query("COMMIT");
    // Return the same shape as router expects
    return {
      message: "Petal submitted for approval",
      petal,
      reviewerIds: reviewerIds.length > 0 ? reviewerIds : null,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error submitting petal:", error);
    // Return error object for the route handler
    return { error: "Failed to submit petal: " + error.message, status: 500 };
  } finally {
    client.release();
  }
};

const rejectPetal = async (req, res) => {
  const { petalId } = req.params;
  try {
    const result = await pool.query(
      `UPDATE petals
           SET submitted = FALSE, status = 'active-assigned'
           WHERE id = $1 RETURNING *`,
      [petalId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Petal not found" });
    }

    res.json({ message: "Petal rejected", petal: result.rows[0] });
  } catch (error) {
    console.error("Error rejecting petal:", error);
    res.status(500).json({ error: "Failed to reject petal" });
  }
};

const dropPetal = async (petalId, userId) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // First get current status and assignments
    const petalResult = await client.query(
      "SELECT status, assigned_user_ids FROM petals WHERE id = $1 FOR UPDATE",
      [petalId]
    );

    if (petalResult.rows.length === 0) {
      throw new Error("Petal not found");
    }

    const currentStatus = petalResult.rows[0].status;
    const assignedUsers = petalResult.rows[0].assigned_user_ids || [];
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
        "User is assigned to this petal, checking for last assignment..."
      );
      const remainingUsers = assignedUsers.filter(
        (id) => Number(id) !== Number(userIdNumber)
      );
      if (remainingUsers.length === 0) {
        console.log(
          "Last assigned user dropping petal, updating status to unassigned"
        );
        if (currentStatus === "submitted") {
          await client.query("ROLLBACK");
          throw new Error("User is the last assigned user on a submitted petal and cannot be removed");
        }

        newStatus = currentStatus === "completed" 
          ? "completed"
          : currentStatus.includes("-unassigned")
          ? currentStatus
          : currentStatus.includes("-assigned")
          ? currentStatus.replace("-assigned", "-unassigned")
          : `${currentStatus}-unassigned`;
      }
    }
    console.log("New status:", newStatus);
    // Update petal
    const updateQuery = `
      UPDATE petals
      SET 
        assigned_user_ids = array_remove(assigned_user_ids, $1),
        status = $2
      WHERE id = $3
      RETURNING *;
    `;

    const result = await client.query(updateQuery, [userId, newStatus, petalId]);

    await client.query("COMMIT");
    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const findById = async (petalId) => {
  const client = await pool.connect();

  try {
    const parsedPetalId = parseInt(petalId, 10);
    if (isNaN(parsedPetalId)) {
      return { error: "Invalid petal ID", status: 400 };
    }

    const query = `
      SELECT 
        t.*,
        p.name as project_name
      FROM petals t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.id = $1
    `;

    const result = await client.query(query, [parsedPetalId]);

    if (result.rows.length === 0) {
      return { error: "Petal not found", status: 404 };
    }

    return result.rows[0];
  } catch (error) {
    console.error("Error fetching petal details:", error);
    return { error: "Failed to fetch petal details", status: 500 };
  } finally {
    client.release();
  }
};

const generatePetals = async (req, res) => {
  const { projectName, projectDescription, interest_tags, creator_id } =
    req.body;

  if (!projectName || !projectDescription || !interest_tags || !creator_id) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const generatedData = await autoGeneratePetals(
      projectName,
      projectDescription,
      interest_tags,
      creator_id
    );
    res.status(200).json(generatedData);
  } catch (error) {
    console.error("Petal generation error:", error);
    res.status(500).json({ error: "Failed to generate petals" });
  }
};

const granularizePetals = async (req, res) => {
  const { projectId } = req.body;

  // Define sanitizeSubpetals first
  const sanitizeSubpetals = (petals, projectId) => {
    let nextId = 1;
    const petalIdToName = {};
    const petalNameToTempId = {};

    petals.forEach((petal) => {
      if (!petal.id) {
        petal.tempId = nextId++; // Store temp ID separately
      } else {
        petal.tempId = petal.id;
        nextId = Math.max(nextId, petal.id + 1);
      }
      petal.project_id = projectId;
      petal.reward_tokens = petal.reward_tokens ?? 100;
      petal.skill_id = petal.skill_id ?? null;

      petalIdToName[petal.tempId] = petal.name;
      petalNameToTempId[petal.name] = petal.tempId;
    });

    petals.forEach((petal) => {
      if (!Array.isArray(petal.dependencies)) {
        petal.dependencies = [];
      } else {
        petal.dependencies = petal.dependencies
          .map((dep) => {
            if (typeof dep === "string") return petalNameToTempId[dep] || null;
            return typeof dep === "number" ? dep : null;
          })
          .filter((dep) => dep !== null);
      }
    });

    return {
      petals,
      petalIdToName,
    };
  };

  if (!projectId) {
    return res.status(400).json({ success: false, error: "Missing projectId" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Fetch all petals in the project
    const petalResult = await client.query(
      `SELECT id, project_id, name, description, skill_id, dependencies 
       FROM petals WHERE project_id = $1`,
      [projectId]
    );
    const petals = petalResult.rows;

    if (petals.length === 0) {
      await client.query("ROLLBACK");
      return res
        .status(404)
        .json({ success: false, error: "No petals found for this project" });
    }

    // Optionally fetch project metadata (optional but helpful for LLM context)
    const projectResult = await client.query(
      `SELECT id, name, description, tags, creator_id FROM projects WHERE id = $1`,
      [projectId]
    );
    const project = projectResult.rows[0];

    // Generate new granular subpetals for ALL petals at once (batch)
    const inputs = petals.map((petal) => ({
      name: petal.name,
      description: petal.description,
      skill_id: petal.skill_id,
    }));

    const subpetals = await autoGenerateSubpetals(
      inputs,
      project.name,
      project.description,
      project.tags || [],
      project.creator_id
    );

    // Now we can call sanitizeSubpetals since it's defined and we have subpetals
    const { petals: sanitizedSubpetals, petalIdToName } = sanitizeSubpetals(
      subpetals,
      projectId
    );

    // Delete all original petals
    await client.query("DELETE FROM petals WHERE project_id = $1", [projectId]);

    // Step 1: Insert all subpetals without dependencies
    const subpetalMetadata = []; // store name + original dependencies + other info

    sanitizedSubpetals.forEach((subpetal) => {
      subpetalMetadata.push({
        projectId: subpetal.project_id,
        name: subpetal.name,
        description: subpetal.description,
        skill_id: subpetal.skill_id || null,
        reward_tokens: subpetal.reward_tokens ?? 100,
        status: "inactive-unassigned",
        originalDependencies: subpetal.dependencies || [],
        dependencyNames: subpetal.dependencies
          .map((id) => petalIdToName[id])
          .filter(Boolean),
      });
    });

    // Insert subpetals (no dependencies yet)
    const insertPromises = subpetalMetadata.map((meta) =>
      client.query(
        `INSERT INTO petals (project_id, name, description, skill_id, status, reward_tokens, dependencies)
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
    subpetalMetadata.forEach((meta, index) => {
      const realPetalId = insertedResults[index].rows[0].id;

      // Convert temp IDs to names, then names to real IDs
      const resolvedDeps = meta.originalDependencies
        .map((tempId) => {
          const depName = petalIdToName[tempId];
          return nameToRealId[depName];
        })
        .filter((depId) => depId !== undefined);

      console.log(
        `Resolved dependencies for petal "${meta.name}" (ID: ${realPetalId}):`,
        resolvedDeps
      );

      updatePromises.push(
        client.query(
          `UPDATE petals SET dependencies = $1::int[] WHERE id = $2`,
          [resolvedDeps, realPetalId]
        )
      );
    });

    await Promise.all(updatePromises);

    // Log the results of the subpetals inserted
    const insertedSubpetals = insertedResults.map((result) => result.rows[0]);

    await client.query("COMMIT");

    res.json({
      success: true,
      project: project || { id: projectId },
      deletedPetals: petals,
      newPetals: insertedSubpetals,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Granularize project petals failed:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  } finally {
    client.release();
  }
};

const payoutPeerReviewRewards = async (petalId, client, io) => {
  // 🧠 Fetch extended petal info for XP, notifications, skill leveling, etc.
  const petalQuery = `
    SELECT t.reward_tokens,
           t.assigned_user_ids,
           t.submitted_by,
           t.skill_id,
           t.status,
           t.project_id,
           p.community_id
    FROM petals t
    JOIN projects p ON t.project_id = p.id
    WHERE t.id = $1;
  `;
  const petalResult = await client.query(petalQuery, [petalId]);

  if (petalResult.rows.length === 0) {
    return { error: "Petal not found", status: 404 };
  }

  const {
    reward_tokens,
    assigned_user_ids,
    submitted_by,
    skill_id,
    project_id,
    community_id,
  } = petalResult.rows[0];

  // Fetch skill name
  const skillNameQuery = await client.query(
    `SELECT name FROM skills WHERE id = $1`,
    [skill_id]
  );
  const skillName = skillNameQuery.rows[0]?.name || "Unknown Skill";

  // 🎓 Calculate rewardPerUser — currently not divided
  const rewardPerUser = reward_tokens;

  // 🎯 XP system and level calculations
  const skillsQuery = `
    SELECT unlocked_users
    FROM skills
    WHERE id = $1 FOR UPDATE;
  `;
  const skillsResult = await client.query(skillsQuery, [skill_id]);
  if (skillsResult.rows.length === 0) {
    return { error: "Skill not found for this petal", status: 404 };
  }

  let rawUnlockedUsers = skillsResult.rows[0].unlocked_users || [];

  const calculateLevel = (exp) => {
    return Math.floor(Math.sqrt(exp / 40)) + 1;
  };

  let parsedSkillEntries = [];
  if (Array.isArray(rawUnlockedUsers)) {
      for (const entry of rawUnlockedUsers) {
          if (entry === null && rawUnlockedUsers.length === 1) continue;
          let parsedEntry;
          try {
              if (typeof entry === 'string') {
                  try {
                      parsedEntry = JSON.parse(entry);
                  } catch (e1) {
                      parsedEntry = JSON.parse(entry.replace(/\\"/g, '"').replace(/^"{|}"}$/g, ""));
                  }
              } else {
                  parsedEntry = entry;
              }
              if (parsedEntry && typeof parsedEntry.user_id !== 'undefined') {
                  parsedSkillEntries.push(parsedEntry);
              }
          } catch (err) {
              console.error("Error parsing entry for DB:", entry, "Error:", err.message);
          }
      }
  }

  const skillEntryMap = new Map(parsedSkillEntries.map(entry => [entry.user_id, entry]));

  for (const userId of assigned_user_ids) {
    let previousXP = 0, previousLevel = 1, newXP = 0, newLevel = 1;

    const existingEntry = skillEntryMap.get(userId);

    if (existingEntry) {
      previousXP = existingEntry.exp;
      previousLevel = existingEntry.level;
      existingEntry.exp += rewardPerUser;
      existingEntry.level = calculateLevel(existingEntry.exp);
      newXP = existingEntry.exp;
      newLevel = existingEntry.level;
      skillEntryMap.set(userId, existingEntry);
    } else {
      newXP = rewardPerUser;
      newLevel = calculateLevel(rewardPerUser);
      const newSkillEntry = { user_id: userId, exp: newXP, level: newLevel };
      skillEntryMap.set(userId, newSkillEntry);
    }

    const room = `user_${userId}`;
    io.to(room).emit("levelUpdate", { previousXP, newXP, previousLevel, newLevel, skillName });
  }

  const finalUpdatedSkillEntries = Array.from(skillEntryMap.values());

  await client.query(
    `UPDATE skills SET unlocked_users = $1 WHERE id = $2`,
    [finalUpdatedSkillEntries, skill_id]
  );

  // Step 5: Update user experience
  if (assigned_user_ids && assigned_user_ids.length > 0) {
    await client.query(
      `UPDATE users SET experience = array_append(COALESCE(experience, '{}'), $1)
       WHERE id = ANY($2)`,
      [petalId.toString(), assigned_user_ids]
    );
  }

  // Step 6: Differential cotoken and token_ledger updates
  const main_reward = reward_tokens;
  const bonus_reward = Math.ceil(reward_tokens / 10);

  // Update cotokens and token_ledger for submitted_by user
  if (submitted_by) {
    await client.query(
      `UPDATE users SET cotokens = cotokens + $1 WHERE id = $2`,
      [main_reward, submitted_by]
    );
    const submitterLedgerEntries = [
      { type: "petal_completion_reward", petalId: petalId, tokens: main_reward, creationDate: new Date(), projectId: project_id }
    ];
    if (community_id) {
      submitterLedgerEntries.push({ type: "community_petal_reward", communityId: community_id, petalId: petalId, tokens: main_reward, creationDate: new Date() });
    }
    await client.query(
      `UPDATE users SET token_ledger = array_cat(COALESCE(token_ledger, '{}'), $1::jsonb[]) WHERE id = $2`,
      [submitterLedgerEntries.map(JSON.stringify), submitted_by]
    );
  }

  // Update cotokens and token_ledger for other assigned users
  if (assigned_user_ids && assigned_user_ids.length > 0) {
    for (const userId of assigned_user_ids) {
      if (userId === submitted_by) continue;

      await client.query(
        `UPDATE users SET cotokens = cotokens + $1 WHERE id = $2`,
        [bonus_reward, userId]
      );
      const bonusLedgerEntries = [
        { type: "petal_completion_bonus", petalId: petalId, tokens: bonus_reward, creationDate: new Date(), projectId: project_id }
      ];
      if (community_id) {
        bonusLedgerEntries.push({ type: "community_petal_bonus", communityId: community_id, petalId: petalId, tokens: bonus_reward, creationDate: new Date() });
      }
      await client.query(
        `UPDATE users SET token_ledger = array_cat(COALESCE(token_ledger, '{}'), $1::jsonb[]) WHERE id = $2`,
        [bonusLedgerEntries.map(JSON.stringify), userId]
      );
    }
  }
  return { success: true };
}

// Process review function
const processReview = async (petalId, userId, action, io) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Get petal details including current approvals/rejections
    const petalQuery = `
      SELECT reviewer_ids, approvals, rejections, status, reward_tokens, project_id
      FROM petals
      WHERE id = $1 FOR UPDATE;
    `;
    const petalResult = await client.query(petalQuery, [petalId]);

    if (petalResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return { error: "Petal not found", status: 404 };
    }

    const {
      reviewer_ids,
      approvals,
      rejections,
      status,
      reward_tokens,
      project_id,
    } = petalResult.rows[0];

    // Check if user is a reviewer
    if (!reviewer_ids.includes(userId)) {
      await client.query("ROLLBACK");
      return { error: "User not authorized to review this petal", status: 403 };
    }

    // Check if petal is still in submitted status
    if (status !== "submitted") {
      await client.query("ROLLBACK");
      return { error: "Petal is not in review status", status: 400 };
    }

    // Update reviewer arrays based on action
    const updateQuery = `
      UPDATE petals
      SET ${
        action === "approve"
          ? "approvals = array_append(approvals, $2)"
          : "rejections = array_append(rejections, $2)"
      }
      WHERE id = $1
      RETURNING approvals, rejections;
    `;
    // Pass userId as $2 so the user's id is appended
    const updateResult = await client.query(updateQuery, [petalId, userId]);
    const newApprovals = updateResult.rows[0].approvals;
    const newRejections = updateResult.rows[0].rejections;
    console.log("New approvals:", newApprovals);
    console.log("New rejections:", newRejections);

    // Award reviewer 10 cotokens
    const reviewerReward = 10;
    await client.query(
      `UPDATE users SET cotokens = cotokens + $1 WHERE id = $2`,
      [reviewerReward, userId] // userId is the reviewer's ID passed to processReview
    );

    // Add to reviewer's token ledger
    const reviewLedgerUpdate = {
      type: "petal_review_reward",
      petalId: petalId,
      tokens: reviewerReward,
      creationDate: new Date(),
      projectId: project_id // project_id is available from petalResult
    };
    await client.query(
      `UPDATE users SET token_ledger = array_append(COALESCE(token_ledger, '{}'), $1::jsonb) WHERE id = $2`,
      [JSON.stringify(reviewLedgerUpdate), userId]
    );

    // Check if we've reached consensus (2 or more approvals/rejections)
    if (newApprovals?.length >= 2 || newRejections?.length >= 2) {
      const finalAction = newApprovals?.length >= 2 ? "approve" : "reject";

      if (finalAction === "approve") {
        // Payout peer review rewards
        const payoutResult = await payoutPeerReviewRewards(petalId, client, io);
        if (payoutResult.error) {
          await client.query("ROLLBACK");
          return payoutResult;
        }

        // Set PM approval deadline
        await client.query(
          `UPDATE petals
           SET pm_approval_deadline = NOW() + INTERVAL '18 hours'
           WHERE id = $1`,
          [petalId]
        );

        // Notify project manager
        const projectOwnerQuery = await client.query(
          `SELECT creator_id FROM projects WHERE id = $1`,
          [project_id]
        );
        const projectOwnerId = projectOwnerQuery.rows[0].creator_id;

        if (projectOwnerId) {
            const notificationMessage = `A petal in your project has passed peer review and is awaiting your approval.`;
            const notificationDetails = JSON.stringify({
                text: notificationMessage,
                projectId: project_id,
                petalId: petalId,
            });
            await client.query(
                `INSERT INTO notifications (user_id, message, type, created_at, read)
                 VALUES ($1, $2, $3, NOW(), false)`,
                [projectOwnerId, notificationDetails, "petal"]
            );
            if (io) {
                io.to(`user_${projectOwnerId}`).emit("notification", {
                    message: notificationMessage,
                    type: "petal",
                    projectId: project_id,
                    petalId: petalId,
                });
            }
        }
      } else {
        // Reject the petal - return to assigned users
        const rejectQuery = `
          UPDATE petals
          SET status = 'active-assigned',
              submitted = false,
              reviewer_ids = ARRAY[]::integer[],
              approvals = ARRAY[]::integer[],
              rejections = ARRAY[]::integer[]
          WHERE id = $1
          RETURNING assigned_user_ids;
        `;
        const rejectResult = await client.query(rejectQuery, [petalId]);
        const assignedUserIds = rejectResult.rows[0].assigned_user_ids;

        // Notify assigned users
        if (assignedUserIds && assignedUserIds.length > 0) {
          const notificationMessage = `Your unfurled petal was rejected and needs revisions.`;
          const notificationDetails = JSON.stringify({
            text: notificationMessage,
            projectId: project_id,
            petalId: petalId,
          });
          await client.query(
            `
            INSERT INTO notifications (user_id, message, type, created_at, read)
            SELECT unnest($1::int[]), $2, $3, NOW(), false
          `,
            [assignedUserIds, notificationDetails, "petal"]
          );

          // Socket notifications
          if (io) {
            assignedUserIds.forEach((uId) => {
              io.to(`user_${uId}`).emit("notification", {
                id: Date.now(),
                type: "petal",
                message: "Your petal was rejected and needs revisions",
                projectId: project_id,
                petalId: petalId,
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

const finalizePetal = async (petalId, client, io) => {
    // This function will handle the final steps after PM approval.
    // It's a subset of the original approvePetal logic.

    const petalQuery = `
      SELECT t.reward_tokens,
             t.assigned_user_ids,
             t.project_id,
             p.community_id,
             p.creator_id,
             t.reflection,
             t.proof_of_work_links,
             t.skill_id,
             t.submitted_by
      FROM petals t
      JOIN projects p ON t.project_id = p.id
      WHERE t.id = $1;
    `;
    const petalResult = await client.query(petalQuery, [petalId]);
    if (petalResult.rows.length === 0) {
        return { error: "Petal not found for finalization", status: 404 };
    }
    const petal = petalResult.rows[0];

    // Step 1: Reward project creator
    if (petal.creator_id) {
      await client.query(
        `UPDATE users SET cotokens = cotokens + 10 WHERE id = $1`,
        [petal.creator_id]
      );
      const creatorLedgerUpdates = [
        { type: "project", id: petal.project_id, tokens: 10, creationDate: new Date() },
      ];
      if (petal.community_id) {
        creatorLedgerUpdates.push({ type: "community", id: petal.community_id, tokens: 10, creationDate: new Date() });
      }
      await client.query(
        `UPDATE users SET token_ledger = array_cat(COALESCE(token_ledger, '{}'), $1::jsonb[]) WHERE id = $2`,
        [creatorLedgerUpdates.map(JSON.stringify), petal.creator_id]
      );
    }

    // Step 2: Update project token stats
    await client.query(
      `
      UPDATE projects SET used_tokens = used_tokens + $1,
        reserved_tokens = GREATEST(0, reserved_tokens - $1)
      WHERE id = $2
    `,
      [petal.reward_tokens, petal.project_id]
    );

    // Step 3: Notify users
    const notificationMessage = `Your unfurled petal was approved by the project manager!`;
    if (petal.assigned_user_ids && petal.assigned_user_ids.length > 0) {
      const notificationDetails = JSON.stringify({
        text: notificationMessage,
        projectId: petal.project_id,
        petalId: petalId,
      });
      await client.query(
          `INSERT INTO notifications (user_id, message, type, created_at, read)
          SELECT unnest($1::int[]), $2, $3, NOW(), false`,
          [petal.assigned_user_ids, notificationDetails, "petal"]
      );
      if (io) {
        for (const userId of petal.assigned_user_ids) {
            io.to(`user_${userId}`).emit("notification", {
                id: Date.now(),
                type: 'petal-approved',
                message: notificationMessage,
                projectId: petal.project_id,
                petalId: petalId,
                read: false,
                timestamp: new Date().toISOString(),
            });
        }
      }
    }

    // Step 4: Create story node (this should happen outside the transaction)
    // We'll return the necessary data for the caller to handle it.
    const tagsQuery = await client.query(`SELECT name FROM skills WHERE id = $1`, [petal.skill_id]);
    const tags = [tagsQuery.rows[0]?.name].filter(Boolean);

    const storyNodeData = {
        petal_id: petalId,
        user_id: petal.submitted_by,
        reflection: petal.reflection || "",
        media_urls: petal.proof_of_work_links || [],
        tags: tags,
    };

    return { success: true, petal, storyNodeData };
}

const approveByPM = async (req, res, io) => {
  const { petalId } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const petalResult = await client.query(`SELECT status, project_id, approvals FROM petals WHERE id = $1 FOR UPDATE`, [petalId]);
    if (petalResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Petal not found' });
    }
    const petal = petalResult.rows[0];
    if (petal.status !== 'submitted') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Petal is not awaiting Project Manager approval' });
    }

    await client.query(`UPDATE petals SET status = 'completed' WHERE id = $1`, [petalId]);

    const finalizeResult = await finalizePetal(petalId, client, io);
    if (finalizeResult.error) {
        await client.query('ROLLBACK');
        return res.status(finalizeResult.status || 500).json({ error: finalizeResult.error });
    }

    await client.query('COMMIT');

    // Create story node after transaction commits
    if (finalizeResult.storyNodeData && finalizeResult.storyNodeData.user_id) {
        try {
            const response = await fetch(`${process.env.BACKEND_URL}/storyChronicles/story-node`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(finalizeResult.storyNodeData),
            });
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Error creating story node: ${response.status} ${response.statusText}`, errorText);
            }
        } catch (fetchError) {
            console.error("Fetch error creating story node:", fetchError);
        }
    }

    res.json({ message: 'Petal approved by Project Manager and completed.', petal: finalizeResult.petal });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in approveByPM:', error);
    res.status(500).json({ error: 'Server error during PM approval' });
  } finally {
    client.release();
  }
};

const rejectByPM = async (req, res, io) => {
    const { petalId } = req.params;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const petalResult = await client.query(`SELECT status, project_id, assigned_user_ids, approvals FROM petals WHERE id = $1 FOR UPDATE`, [petalId]);
        if (petalResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Petal not found' });
        }
        const petal = petalResult.rows[0];
        if (petal.status !== 'submitted' || petal.approvals?.length < 2) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Petal is not awaiting Project Manager approval' });
        }

        const rejectQuery = `
          UPDATE petals
          SET status = 'active-assigned',
              submitted = false,
              reviewer_ids = ARRAY[]::integer[],
              approvals = ARRAY[]::integer[],
              rejections = ARRAY[]::integer[]
          WHERE id = $1
          RETURNING assigned_user_ids;
        `;
        const rejectResult = await client.query(rejectQuery, [petalId]);
        const assignedUserIds = rejectResult.rows[0].assigned_user_ids;

        // Notify assigned users
        if (assignedUserIds && assignedUserIds.length > 0) {
          const notificationMessage = `Your unfurled petal was rejected by the Project Manager and needs revisions.`;
          const notificationDetails = JSON.stringify({
            text: notificationMessage,
            projectId: petal.project_id,
            petalId: petalId,
          });
          await client.query(
            `
            INSERT INTO notifications (user_id, message, type, created_at, read)
            SELECT unnest($1::int[]), $2, $3, NOW(), false
          `,
            [assignedUserIds, notificationDetails, "petal"]
          );
          if (io) {
            assignedUserIds.forEach((userId) => {
              io.to(`user_${userId}`).emit("notification", {
                id: Date.now(),
                type: "petal",
                message: notificationMessage,
                projectId: petal.project_id,
                petalId: petalId,
                read: false,
                timestamp: new Date().toISOString(),
              });
            });
          }
        }
        await client.query('COMMIT');
        res.json({ message: 'Petal rejected by Project Manager.' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error in rejectByPM:', error);
        res.status(500).json({ error: 'Server error during PM rejection' });
    } finally {
        client.release();
    }
};

const getPmApprovalPetals = async (userId) => {
    const client = await pool.connect();
    try {
        const query = `
            SELECT t.*, p.name as project_name
            FROM petals t
            JOIN projects p ON t.project_id = p.id
            WHERE p.creator_id = $1 AND t.status = 'submitted' AND array_length(t.approvals, 1) >= 2
        `;
        const result = await client.query(query, [userId]);
        return result.rows;
    } catch (error) {
        console.error('Error fetching PM approval petals:', error);
        throw new Error('Failed to fetch PM approval petals');
    } finally {
        client.release();
    }
};

// Function to get petals the user is a reviewer for
const getReviewerPetals = async (userId) => {
  const client = await pool.connect();
  const userIdNumber = Number(userId);
  try {
    const query = `
      SELECT t.*, p.name as project_name
      FROM petals t
      JOIN projects p ON t.project_id = p.id
      WHERE $1::int = ANY(t.reviewer_ids)
    `;

    const result = await client.query(query, [userIdNumber]);

    if (result.rows.length === 0) {
      console.log("No petals found for this reviewer");
      return [];
    }

    return result.rows;
  } catch (error) {
    console.error("Error fetching reviewer petals:", error);
    return { error: "Failed to fetch reviewer petals", status: 500 };
  } finally {
    client.release();
  }
};

export default {
  getReviewerPetals,
  processReview,
  granularizePetals,
  generatePetals,
  getAllPetals,
  getRelevantPetals,
  getProjectRelevantPetals,
  getPlanetSpecificPetals,
  acceptPetal,
  getPetalsByProjectId,
  getSkillNamesByIds,
  getSkillIdByName,
  createNewPetal,
  updatePetal,
  submitPetal,
  approvePetal,
  rejectPetal,
  dropPetal,
  createPetalRoute,
  resetAllSpentPoints,
  findById,
  payoutPeerReviewRewards,
  approveByPM,
  rejectByPM,
  finalizePetal,
  getPmApprovalPetals,
};
