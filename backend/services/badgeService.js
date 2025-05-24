import pool from '../db.js';

// Import all helper functions (even if they are just placeholders for now)
// This makes the switch statement cleaner if we decide to export them individually later.
// For now, they are part of the same file, so direct calls are fine.

/**
 * Checks all badge conditions for a user and awards new badges.
 * @param {number} userId - The ID of the user.
 */
async function checkAndAwardBadges(userId) {
    console.log(`Starting badge check for user ${userId}`);
    const newlyAwardedBadgeIds = [];

    try {
        // 1. Fetch all badge definitions
        const allBadgesResult = await pool.query('SELECT id, name FROM badges');
        const allBadges = allBadgesResult.rows;

        if (!allBadges.length) {
            console.warn('No badge definitions found in the database.');
            return;
        }

        // 2. Fetch user's current badges
        let currentUserBadgeIds = [];
        try {
            const userBadgesResult = await pool.query('SELECT badge_ids FROM user_badges WHERE user_id = $1', [userId]);
            if (userBadgesResult.rows.length > 0) {
                currentUserBadgeIds = userBadgesResult.rows[0].badge_ids || [];
            }
        } catch (err) {
            console.error(`Error fetching current badges for user ${userId}:`, err);
            // Decide if to proceed or return. For now, proceed assuming no badges.
        }

        // Fetch data needed for badge check functions
        const completedUserTasks = await getCompletedTasksForUser(userId);
        
        let skillCategoriesMap = new Map();
        if (completedUserTasks.length > 0) {
            const uniqueSkillIds = Array.from(new Set(completedUserTasks.map(task => task.skill_id).filter(id => id != null)));
            if (uniqueSkillIds.length > 0) {
                skillCategoriesMap = await getSkillCategories(uniqueSkillIds);
            }
        }
        // TODO: As more badges are implemented, fetch other necessary data here (e.g., userActivity)
        const userEndorsementsWithDetails = await getUserEndorsementsWithTaskDetails(userId);
        const createdUserProjects = await getProjectsCreatedByUser(userId);
        const createdUserTasksWithAssignees = await getTasksCreatedByUserWithAssignees(userId);
        const userAccountData = await getUserAccountData(userId);
        
        // Placeholder for data needed by other badges not yet implemented with specific data retrieval
        const otherBadgeData = {}; 

        // 3. Iterate and Check Badges
        for (const badge of allBadges) {
            console.log(`Checking badge: ${badge.name} for user ${userId}`);

            if (currentUserBadgeIds.includes(badge.id)) {
                console.log(`User ${userId} already has badge: ${badge.name} (ID: ${badge.id})`);
                continue;
            }

            let qualifies = false;
            switch (badge.name) {
                case "Bounty Hunter":
                    qualifies = await checkBountyHunter(userId, completedUserTasks);
                    break;
                case "Cosmic Contractor":
                    qualifies = await checkCosmicContractor(userId, completedUserTasks);
                    break;
                case "Legendary Outlaw":
                    qualifies = await checkLegendaryOutlaw(userId, completedUserTasks);
                    break;
                case "Warp Speed Worker": // Assuming "Warp Speed Worker" is the exact name in the badges table
                    qualifies = await checkWarpSpeedWorker(userId, completedUserTasks);
                    break;
                case "Space Engineer":
                    qualifies = await checkSpaceEngineer(userId, completedUserTasks, skillCategoriesMap);
                    break;
                case "Stellar Artisan":
                    qualifies = await checkStellarArtisan(userId, completedUserTasks, skillCategoriesMap);
                    break;
                case "Interstellar Fixer":
                    qualifies = await checkInterstellarFixer(userId, userEndorsementsWithDetails);
                    break;
                case "Captain Of The Crew": // Ensure this name matches the 'name' column in the 'badges' table
                    qualifies = await checkCaptainOfTheCrew(userId, createdUserProjects);
                    break;
                case "Cosmic Collaborator": // Ensure this name matches the 'name' column in the 'badges' table
                    qualifies = await checkCosmicCollaborator(userId, completedUserTasks);
                    break;
                case "Quantum Mentor": // Ensure this name matches the 'name' column in the 'badges' table
                    qualifies = await checkQuantumMentor(userId, userEndorsementsWithDetails);
                    break;
                case "Lunar Visionary": // Ensure this name matches the 'name' column in the 'badges' table
                    qualifies = await checkLunarVisionary(userId, createdUserTasksWithAssignees);
                    break;
                case "Supernova Survivor": // Ensure this name matches the 'name' column in the 'badges' table
                    qualifies = await checkSupernovaSurvivor(userId, userAccountData);
                    break;
                case "Ancient Artifact": // Ensure this name matches the 'name' column in the 'badges' table
                    qualifies = await checkAncientArtifact(userId, userAccountData);
                    break;
                default:
                    console.warn(`Unknown badge name: ${badge.name} (ID: ${badge.id}). No check function defined.`);
            }

            if (qualifies) {
                newlyAwardedBadgeIds.push(badge.id);
                console.log(`User ${userId} qualifies for new badge: ${badge.name} (ID: ${badge.id})`);
            }
        }

        // 4. Award New Badges
        if (newlyAwardedBadgeIds.length > 0) {
            console.log(`User ${userId} awarded new badges: ${newlyAwardedBadgeIds.join(', ')}`);

            // Fetch current badges again to be safe in case of concurrent updates, though less likely here.
            // Or use the previously fetched currentUserBadgeIds.
            const finalBadgeIds = Array.from(new Set([...currentUserBadgeIds, ...newlyAwardedBadgeIds]));

            // UPSERT operation: Insert or Update user_badges
            const upsertQuery = `
                INSERT INTO user_badges (user_id, badge_ids)
                VALUES ($1, $2)
                ON CONFLICT (user_id) DO UPDATE
                SET badge_ids = $2;
            `;
            await pool.query(upsertQuery, [userId, finalBadgeIds]);
            console.log(`Successfully updated badges for user ${userId}. New badge list: ${finalBadgeIds.join(', ')}`);
        } else {
            console.log(`No new badges awarded to user ${userId}`);
        }

    } catch (error) {
        console.error(`Error in checkAndAwardBadges for user ${userId}:`, error);
        // Depending on the error, you might want to throw it or handle it gracefully.
    }
}

/**
 * Checks if the user qualifies for Bounty Hunter.
 * @param {number} userId - The ID of the user.
 * @param {Array<object>} completedTasks - Array of completed task objects for the user.
 * @returns {boolean}
 */
async function checkBountyHunter(userId, completedTasks) {
    console.log(`User ${userId} completed ${completedTasks.length} tasks. Checking for Bounty Hunter (5 tasks).`);
    return completedTasks.length >= 5;
}

/**
 * Checks if the user qualifies for Cosmic Contractor.
 * @param {number} userId - The ID of the user.
 * @param {Array<object>} completedTasks - Array of completed task objects for the user.
 * @returns {boolean}
 */
async function checkCosmicContractor(userId, completedTasks) {
    console.log(`User ${userId} completed ${completedTasks.length} tasks. Checking for Cosmic Contractor (10 tasks).`);
    return completedTasks.length >= 10;
}

/**
 * Checks if the user qualifies for Legendary Outlaw.
 * @param {number} userId - The ID of the user.
 * @param {Array<object>} completedTasks - Array of completed task objects for the user.
 * @returns {boolean}
 */
async function checkLegendaryOutlaw(userId, completedTasks) {
    console.log(`User ${userId} completed ${completedTasks.length} tasks. Checking for Legendary Outlaw (50 tasks).`);
    return completedTasks.length >= 50;
}

/**
 * Checks if the user qualifies for Warp Speed Worker.
 * @param {number} userId - The ID of the user.
 * @param {Array<object>} completedTasks - Array of completed task objects for the user.
 * @returns {boolean}
 */
async function checkWarpSpeedWorker(userId, completedTasks) {
    // Using task.created_at as a proxy for claimed_at as per current schema limitations.
    console.log(`User ${userId}: Checking for Warp-Speed Worker. Found ${completedTasks.length} completed tasks.`);
    const oneHourInMs = 3600000; // 1 hour = 60 * 60 * 1000 milliseconds

    for (const task of completedTasks) {
        if (task.submitted_at && task.created_at) {
            const submittedAt = new Date(task.submitted_at).getTime();
            const createdAt = new Date(task.created_at).getTime();
            const diffInMs = submittedAt - createdAt;

            if (diffInMs < oneHourInMs && diffInMs >= 0) { // Ensure diff is positive and less than 1 hour
                console.log(`User ${userId} qualifies for Warp-Speed Worker with task ${task.id}. Time: ${diffInMs} ms.`);
                return true;
            }
        }
    }
    return false;
}

/**
 * Checks if the user qualifies for Space Engineer.
 * @param {number} userId - The ID of the user.
 * @param {Array<object>} completedTasks - Array of completed task objects for the user.
 * @param {Map<number, string>} skillCategoriesMap - Map of skill IDs to their categories.
 * @returns {boolean}
 */
async function checkSpaceEngineer(userId, completedTasks, skillCategoriesMap) {
    console.log(`User ${userId}: Checking for Space Engineer. Examining ${completedTasks.length} tasks.`);
    for (const task of completedTasks) {
        if (task.skill_id) {
            const category = skillCategoriesMap.get(task.skill_id);
            if (category === 'technical/coding') {
                console.log(`User ${userId} qualifies for Space Engineer with task ${task.id} (skill category: ${category}).`);
                return true;
            }
        }
    }
    return false;
}

/**
 * Checks if the user qualifies for Stellar Artisan.
 * @param {number} userId - The ID of the user.
 * @param {Array<object>} completedTasks - Array of completed task objects for the user.
 * @param {Map<number, string>} skillCategoriesMap - Map of skill IDs to their categories.
 * @returns {boolean}
 */
async function checkStellarArtisan(userId, completedTasks, skillCategoriesMap) {
    console.log(`User ${userId}: Checking for Stellar Artisan. Examining ${completedTasks.length} tasks.`);
    for (const task of completedTasks) {
        if (task.skill_id) {
            const category = skillCategoriesMap.get(task.skill_id);
            if (category === 'creative') {
                console.log(`User ${userId} qualifies for Stellar Artisan with task ${task.id} (skill category: ${category}).`);
                return true;
            }
        }
    }
    return false;
}

/**
 * Checks if the user qualifies for Interstellar Fixer.
 * An Interstellar Fixer is a user who provides a meaningful comment (endorsement)
 * on another user's task *before* that task is submitted.
 * @param {number} userId - The ID of the user.
 * @param {Array<object>} userEndorsementsWithTaskDetails - Array of endorsement objects with task details.
 * @returns {boolean}
 */
async function checkInterstellarFixer(userId, userEndorsementsWithTaskDetails) {
    console.log(`User ${userId}: Checking for Interstellar Fixer. Examining ${userEndorsementsWithTaskDetails.length} endorsements made by user.`);
    for (const endorsement of userEndorsementsWithTaskDetails) {
        // Ensure task_submitted_at is not null before creating a Date object from it
        if (endorsement.task_creator_id !== userId &&
            endorsement.task_submitted_at != null && // Check that the task was actually submitted
            new Date(endorsement.endorsement_created_at) < new Date(endorsement.task_submitted_at)) {
            // For now, any comment (endorsement) counts as "meaningful"
            console.log(`User ${userId} qualifies for Interstellar Fixer with endorsement on task linked to story_node ${endorsement.story_node_id} (Task creator: ${endorsement.task_creator_id}).`);
            return true;
        }
    }
    return false;
}

/**
 * Checks if the user qualifies for Captain Of The Crew.
 * A Captain of the Crew is a user who has created a project with at least 3 contributors.
 * @param {number} userId - The ID of the user (creator).
 * @param {Array<object>} createdProjects - Array of project objects created by the user.
 * @returns {boolean}
 */
async function checkCaptainOfTheCrew(userId, createdProjects) {
    console.log(`User ${userId}: Checking for Captain of the Crew. Found ${createdProjects.length} created projects.`);
    for (const project of createdProjects) {
        // Assuming project.user_ids stores only contributors, not including the creator.
        if (project.user_ids && project.user_ids.length >= 3) {
            console.log(`User ${userId} qualifies for Captain of the Crew with project ${project.id} having ${project.user_ids.length} contributors.`);
            return true;
        }
    }
    return false;
}

/**
 * Checks if the user qualifies for Cosmic Collaborator.
 * A Cosmic Collaborator is a user who has completed a task that had more than one assigned user.
 * @param {number} userId - The ID of the user.
 * @param {Array<object>} completedTasks - Array of completed task objects for the user.
 * @returns {boolean}
 */
async function checkCosmicCollaborator(userId, completedTasks) {
    console.log(`User ${userId}: Checking for Cosmic Collaborator. Examining ${completedTasks.length} completed tasks.`);
    for (const task of completedTasks) {
        if (task.assigned_user_ids && task.assigned_user_ids.length > 1) {
            // Check if the current user is one of the assigned users for this completed task
            if (task.assigned_user_ids.includes(userId)) {
                 console.log(`User ${userId} qualifies for Cosmic Collaborator with task ${task.id} having ${task.assigned_user_ids.length} collaborators.`);
                 return true;
            }
        }
    }
    return false;
}

/**
 * Checks if the user qualifies for Quantum Mentor.
 * A Quantum Mentor is a user who has made at least 10 unique task comments (via story nodes).
 * @param {number} userId - The ID of the user.
 * @param {Array<object>} userEndorsementsWithTaskDetails - Array of endorsement objects made by the user.
 * @returns {boolean}
 */
async function checkQuantumMentor(userId, userEndorsementsWithTaskDetails) {
    // userEndorsementsWithTaskDetails is already filtered for the current userId by getUserEndorsementsWithTaskDetails
    const uniqueStoryNodeIds = new Set(userEndorsementsWithTaskDetails.map(e => e.story_node_id));
    console.log(`User ${userId}: Checking for Quantum Mentor. User made ${uniqueStoryNodeIds.size} unique task comments (via story nodes).`);
    if (uniqueStoryNodeIds.size >= 10) {
        console.log(`User ${userId} qualifies for Quantum Mentor.`);
        return true;
    }
    return false;
}

/**
 * Checks if the user qualifies for Lunar Visionary.
 * A Lunar Visionary is a user who created a task that was completed by another user(s).
 * @param {number} userId - The ID of the user (creator).
 * @param {Array<object>} createdTasksWithAssignees - Array of task objects created by the user, including assignees and status.
 * @returns {boolean}
 */
async function checkLunarVisionary(userId, createdTasksWithAssignees) {
    console.log(`User ${userId}: Checking for Lunar Visionary. Found ${createdTasksWithAssignees.length} created tasks.`);
    for (const task of createdTasksWithAssignees) {
        if (task.status === 'completed' &&
            task.assigned_user_ids &&
            task.assigned_user_ids.length > 0 &&
            !task.assigned_user_ids.includes(userId)) {
            console.log(`User ${userId} qualifies for Lunar Visionary with task ${task.id} completed by others.`);
            return true;
        }
    }
    return false;
}

/**
 * Checks if the user qualifies for Supernova Survivor.
 * A Supernova Survivor is a user whose account is at least 1 year old.
 * @param {number} userId - The ID of the user.
 * @param {object|null} userAccountData - Object containing user's `created_at` or null.
 * @returns {boolean}
 */
async function checkSupernovaSurvivor(userId, userAccountData) {
    console.log(`User ${userId}: Checking for Supernova Survivor. Account data: ${JSON.stringify(userAccountData)}`);
    if (!userAccountData || !userAccountData.created_at) {
        return false;
    }
    const accountCreationDate = new Date(userAccountData.created_at);
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    if (accountCreationDate <= oneYearAgo) {
        console.log(`User ${userId} qualifies for Supernova Survivor. Account created at: ${userAccountData.created_at}`);
        return true;
    }
    return false;
}

/**
 * Checks if the user qualifies for Ancient Artifact.
 * An Ancient Artifact is a user whose account is at least 3 years old.
 * @param {number} userId - The ID of the user.
 * @param {object|null} userAccountData - Object containing user's `created_at` or null.
 * @returns {boolean}
 */
async function checkAncientArtifact(userId, userAccountData) {
    console.log(`User ${userId}: Checking for Ancient Artifact. Account data: ${JSON.stringify(userAccountData)}`);
    if (!userAccountData || !userAccountData.created_at) {
        return false;
    }
    const accountCreationDate = new Date(userAccountData.created_at);
    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

    if (accountCreationDate <= threeYearsAgo) {
        console.log(`User ${userId} qualifies for Ancient Artifact. Account created at: ${userAccountData.created_at}`);
        return true;
    }
    return false;
}

/**
 * Fetches the account creation date for a specific user.
 * @param {number} userId - The ID of the user.
 * @returns {Promise<object|null>} A promise that resolves to an object like { created_at: '...' } or null if not found/error.
 */
async function getUserAccountData(userId) {
    console.log(`Fetching account data for user ${userId}`);
    try {
        const query = `SELECT created_at FROM users WHERE id = $1;`;
        const { rows } = await pool.query(query, [userId]);
        if (rows.length > 0) {
            console.log(`Account data found for user ${userId}: ${JSON.stringify(rows[0])}`);
            return { created_at: rows[0].created_at };
        } else {
            console.log(`No account data found for user ${userId}.`);
            return null;
        }
    } catch (error) {
        console.error(`Error fetching account data for user ${userId}:`, error);
        return null; 
    }
}

/**
 * Fetches tasks created by a specific user, including their assignees and status.
 * @param {number} userId - The ID of the user.
 * @returns {Promise<Array<object>>} A promise that resolves to an array of task objects.
 * Each task object includes 'id', 'assigned_user_ids', and 'status'.
 */
async function getTasksCreatedByUserWithAssignees(userId) {
    console.log(`Fetching tasks created by user ${userId} with assignees and status.`);
    try {
        const query = `SELECT id, assigned_user_ids, status FROM tasks WHERE creator_id = $1;`;
        const { rows } = await pool.query(query, [userId]);
        if (rows.length === 0) {
            console.log(`No tasks found created by user ${userId}.`);
        } else {
            console.log(`Fetched ${rows.length} tasks created by user ${userId}.`);
        }
        return rows;
    } catch (error) {
        console.error(`Error fetching created tasks for user ${userId}:`, error);
        return []; // Return an empty array in case of error
    }
}

/**
 * Fetches projects created by a specific user.
 * @param {number} userId - The ID of the user.
 * @returns {Promise<Array<object>>} A promise that resolves to an array of project objects created by the user.
 * Each project object includes 'id' and 'user_ids'.
 */
async function getProjectsCreatedByUser(userId) {
    console.log(`Fetching projects created by user ${userId}`);
    try {
        const query = `SELECT id, user_ids FROM projects WHERE creator_id = $1;`;
        const { rows } = await pool.query(query, [userId]);
        if (rows.length === 0) {
            console.log(`No projects found created by user ${userId}.`);
        } else {
            console.log(`Fetched ${rows.length} projects created by user ${userId}.`);
        }
        return rows;
    } catch (error) {
        console.error(`Error fetching projects for user ${userId}:`, error);
        return []; // Return an empty array in case of error
    }
}

/**
 * Fetches endorsements made by a user, along with details of the tasks associated with those endorsements.
 * @param {number} userId - The ID of the user who made the endorsements.
 * @returns {Promise<Array<object>>} A promise that resolves to an array of objects, each containing:
 *  - endorsement_created_at: timestamp of the endorsement
 *  - story_node_id: ID of the story node endorsed
 *  - task_creator_id: ID of the creator of the task linked to the story node
 *  - task_submitted_at: timestamp of when the linked task was submitted
 *  - task_status: status of the linked task
 */
async function getUserEndorsementsWithTaskDetails(userId) {
    console.log(`Fetching endorsements with task details for user ${userId}`);
    try {
        const query = `
            SELECT
                e.created_at AS endorsement_created_at,
                e.story_node_id, 
                t.creator_id AS task_creator_id,
                t.submitted_at AS task_submitted_at,
                t.status AS task_status
            FROM endorsements e
            JOIN story_nodes sn ON e.story_node_id = sn.id
            JOIN tasks t ON sn.task_id = t.id
            WHERE e.endorser_id = $1;
        `;
        const { rows } = await pool.query(query, [userId]);
        if (rows.length === 0) {
            console.log(`No endorsements found for user ${userId}.`);
        } else {
            console.log(`Fetched ${rows.length} endorsements with task details for user ${userId}.`);
        }
        return rows;
    } catch (error) {
        console.error(`Error fetching endorsements with task details for user ${userId}:`, error);
        return []; // Return an empty array in case of error
    }
}

/**
 * Retrieves skill categories for a given list of skill IDs.
 * @param {Array<number>} skillIds - An array of skill IDs.
 * @returns {Promise<Map<number, string>>} A promise that resolves to a Map where keys are skill_id and values are category.
 */
async function getSkillCategories(skillIds) {
    if (!skillIds || skillIds.length === 0) {
        console.log('getSkillCategories: No skill IDs provided.');
        return new Map();
    }
    try {
        // Ensure skillIds are unique and non-null for the query
        const uniqueSkillIds = Array.from(new Set(skillIds.filter(id => id != null)));
        if (uniqueSkillIds.length === 0) {
            console.log('getSkillCategories: No valid unique skill IDs after filtering.');
            return new Map();
        }

        const query = `SELECT id, category FROM skills WHERE id = ANY($1::int[]);`;
        const { rows } = await pool.query(query, [uniqueSkillIds]);
        
        const skillCategoriesMap = new Map();
        for (const row of rows) {
            skillCategoriesMap.set(row.id, row.category);
        }
        console.log(`Fetched categories for ${skillCategoriesMap.size} skills of ${uniqueSkillIds.length} requested.`);
        return skillCategoriesMap;
    } catch (error) {
        console.error('Error fetching skill categories:', error);
        return new Map(); // Return an empty map in case of error
    }
}

/**
 * Fetches completed tasks for a specific user.
 * @param {number} userId - The ID of the user.
 * @returns {Promise<Array<object>>} A promise that resolves to an array of completed task objects.
 */
async function getCompletedTasksForUser(userId) {
    try {
        const query = `
            SELECT * 
            FROM tasks 
            WHERE $1 = ANY(assigned_user_ids) AND status = 'completed';
        `;
        const { rows } = await pool.query(query, [userId]);
        console.log(`Fetched ${rows.length} completed tasks for user ${userId}`);
        return rows;
    } catch (error) {
        console.error(`Error fetching completed tasks for user ${userId}:`, error);
        return []; // Return an empty array in case of error
    }
}

export { checkAndAwardBadges };