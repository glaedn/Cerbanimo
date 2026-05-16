import express from 'express';
import multer from 'multer';
import path from 'path';
import pool from '../db.js';
import { generateProjectIdea, autoGenerateTasks, analyzeResume } from '../services/taskGenerator.js';
import { checkAndAwardBadges } from '../services/badgeService.js';
import GuildService from '../services/GuildService.js';
import { processInterests } from '../services/interestService.js';

const router = express.Router();

const parseUnlockedUsers = (unlockedUsers) => {
  if (!unlockedUsers || unlockedUsers.length === 0) return [];

  return unlockedUsers
    .map((entry) => {
      try {
        let parsed = typeof entry === "string" ? JSON.parse(entry) : entry;
        if (typeof parsed === "string") {
          parsed = JSON.parse(
            parsed.replace(/\\"/g, '"').replace(/^"{|}"}$/g, "")
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

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

// POST /initiate route for onboarding
router.post('/initiate', upload.single('profilePicture'), async (req, res) => {
  const auth0_id = req.auth.payload.sub;
  const { username, resumeText, primeDirective } = req.body;
  let { skills, interests } = req.body; // These might be JSON strings

  // Parse skills and interests if they are strings
  try {
    if (typeof skills === 'string') {
      skills = JSON.parse(skills);
    }
    if (typeof interests === 'string') {
      interests = JSON.parse(interests);
    }
  } catch (error) {
    return res.status(400).json({ message: 'Invalid skills or interests format. Expected JSON parsable string or array.', error: error.message });
  }


  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Fetch User ID
    const userResult = await client.query('SELECT id FROM users WHERE auth0_id = $1', [auth0_id]);
    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'User not found.' });
    }
    const internalUserId = userResult.rows[0].id;

    // 2. Update Username and Profile Picture
    const profilePicturePath = req.file ? req.file.path : null;
    let updateUserQuery = 'UPDATE users SET username = $1';
    const queryParams = [username, internalUserId];

    if (profilePicturePath) {
      updateUserQuery += ', profile_picture = $2 WHERE id = $3 RETURNING *';
      queryParams.splice(1, 0, profilePicturePath); // Insert profilePicturePath at index 1
    } else {
      updateUserQuery += ' WHERE id = $2 RETURNING *';
    }
    
    const updatedUserResult = await client.query(updateUserQuery, queryParams);
    const updatedUser = updatedUserResult.rows[0];


    // 3. Process and Save Skills
    const processedSkillsMap = new Map();

    // --- Resume Analysis ---
    if (resumeText && resumeText.trim()) {
      try {
        const resumeData = await analyzeResume(resumeText);
        if (resumeData && resumeData.skills) {
          for (const resumeSkill of resumeData.skills) {
            const skillName = resumeSkill.name;
            // XP from resumes is temporarily disabled until guild leveling is implemented.
            // const skillExp = resumeSkill.xp || 0;
            // const skillLevel = Math.floor(Math.sqrt(skillExp / 40)) + 1;
            const skillExp = 0;
            const skillLevel = 1;

            let skillId;
            const existingSkillResult = await client.query('SELECT id, unlocked_users FROM skills WHERE name = $1', [skillName]);

            if (existingSkillResult.rows.length > 0) {
              skillId = existingSkillResult.rows[0].id;
              let parsedUsers = parseUnlockedUsers(existingSkillResult.rows[0].unlocked_users);

              const userIndex = parsedUsers.findIndex(u => u.user_id === internalUserId);
              if (userIndex !== -1) {
                // If user already has the skill, don't update XP/Level from resume for now.
                // parsedUsers[userIndex].exp += skillExp;
                // parsedUsers[userIndex].level = Math.floor(Math.sqrt(parsedUsers[userIndex].exp / 40)) + 1;
              } else {
                parsedUsers.push({ user_id: internalUserId, level: skillLevel, exp: skillExp });
              }
              await client.query('UPDATE skills SET unlocked_users = $1::jsonb[] WHERE id = $2', [parsedUsers.map(u => JSON.stringify(u)), skillId]);
            } else {
              const newSkillResult = await client.query(
                'INSERT INTO skills (name, parent_skill_id, unlocked_users) VALUES ($1, NULL, $2::jsonb[]) RETURNING id',
                [skillName, [JSON.stringify({ user_id: internalUserId, level: skillLevel, exp: skillExp })]]
              );
              skillId = newSkillResult.rows[0].id;
            }
            processedSkillsMap.set(skillId, { id: skillId, name: skillName });
          }
        }
      } catch (resumeError) {
        console.error('Error processing resume during onboarding:', resumeError);
        // Continue onboarding even if resume analysis fails
      }
    }

    // --- Manual Skills ---
    if (skills && Array.isArray(skills)) {
      for (const skillObj of skills) {
        const skillName = skillObj.name;
        let skillId;

        const existingSkillResult = await client.query('SELECT id, unlocked_users FROM skills WHERE name = $1', [skillName]);
        
        if (existingSkillResult.rows.length > 0) {
          skillId = existingSkillResult.rows[0].id;
          let parsedUsers = parseUnlockedUsers(existingSkillResult.rows[0].unlocked_users);

          const userInSkill = parsedUsers.find(u => u.user_id === internalUserId);
          if (!userInSkill) {
              parsedUsers.push({ user_id: internalUserId, level: 0, exp: 0 });
              await client.query('UPDATE skills SET unlocked_users = $1::jsonb[] WHERE id = $2', [parsedUsers.map(u => JSON.stringify(u)), skillId]);
          }
        } else {
          const newSkillResult = await client.query(
            'INSERT INTO skills (name, parent_skill_id, unlocked_users) VALUES ($1, NULL, $2::jsonb[]) RETURNING id',
            [skillName, [JSON.stringify({ user_id: internalUserId, level: 0, exp: 0 })]]
          );
          skillId = newSkillResult.rows[0].id;
        }
        processedSkillsMap.set(skillId, { id: skillId, name: skillName });
      }
    }

    const processedSkills = Array.from(processedSkillsMap.values());

    // 4. Process and Save Interests
    const processedInterests = await processInterests(interests, internalUserId, client);

    // 5. Update User's Skills and Interests in users table
    await client.query(
      'UPDATE users SET skills = $1::jsonb[], interests = $2::jsonb[] WHERE id = $3',
      [processedSkills, processedInterests, internalUserId]
    );

    // 5. Update User's Skills and Interests in users table (Done before project generation)
    await client.query(
      'UPDATE users SET skills = $1::text[], interests = $2::text[] WHERE id = $3',
      [processedSkills.map(s => JSON.stringify(s)), processedInterests.map(i => JSON.stringify(i)), internalUserId]
    );

    // --- Project and Task Generation ---
    let newProjectId;
    let generatedProjectName;

    try {
      // 6. Generate Project Idea
      const skillNames = processedSkills.map(s => s.name);
      const interestNames = processedInterests.map(i => i.name);
      
      const projectIdea = await generateProjectIdea(skillNames, interestNames, primeDirective);
      generatedProjectName = projectIdea.Name;
      const generatedProjectDescription = projectIdea.Description;

      // 7. Generate Tasks for the New Project
      const generatedTasksData = await autoGenerateTasks(generatedProjectName, generatedProjectDescription, [], internalUserId);
      const tasksToInsert = generatedTasksData.tasks;
      const llmProject = (generatedTasksData.projects && generatedTasksData.projects[0]) || {};
      const projectDueDate = llmProject.due_date || null;

      // 8. Create Project
      const projectInsertResult = await client.query(
        'INSERT INTO projects (name, description, creator_id, tags, due_date) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [generatedProjectName, generatedProjectDescription, internalUserId, [], projectDueDate]
      );
      newProjectId = projectInsertResult.rows[0].id;

      if (tasksToInsert && tasksToInsert.length > 0) {
        const llmToDbIdMap = {};

        // First pass: Insert tasks WITHOUT dependencies, and build LLM ID → DB ID map
        for (const task of tasksToInsert) {
          // Ensure default status and reward tokens if not provided by LLM
          const status = task.status || 'inactive-unassigned';
          const reward_tokens = task.reward_tokens || 50; // Default reward tokens
          const skillId = await GuildService.getOrCreateSkill(task.skill_name);

          const taskInsertResult = await client.query(
            'INSERT INTO tasks (project_id, name, description, skill_id, skill_level, status, dependencies, reward_tokens, creator_id, start_date, due_date, is_local) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id',
            [newProjectId, task.name, task.description, skillId, task.skill_level || 0, status, [], reward_tokens, internalUserId, task.start_date || null, task.due_date || null, task.is_local || false]
          );
          const dbId = taskInsertResult.rows[0].id;
          task.db_id_internal = dbId; // Store actual DB ID on task object to avoid collision issues

          // If LLM reused an ID, we prioritize the first one for dependency resolution
          if (llmToDbIdMap[task.id] === undefined) {
            llmToDbIdMap[task.id] = dbId;
          }
        }

        // Second pass: Update dependencies with resolved DB IDs
        for (const task of tasksToInsert) {
          const dbId = task.db_id_internal; // Use the stored internal DB ID
          const resolvedDeps = (Array.isArray(task.dependencies) ? task.dependencies : [])
                                .map(depLlmId => llmToDbIdMap[depLlmId])
                                .filter(depDbId => depDbId != null); // Filter out any unresolved dependencies

          if (resolvedDeps.length > 0) {
            await client.query(
              'UPDATE tasks SET dependencies = $1 WHERE id = $2',
              [resolvedDeps, dbId]
            );
          }
        }
      }
    } catch (genError) {
      // If project/task generation fails, we still want to commit the user profile changes.
      // So, we don't necessarily rollback the entire transaction here unless it's a DB constraint error.
      // For now, log the error and proceed to commit user data. The project/tasks will be missing.
      // A more sophisticated approach might involve partial commits or user notification of partial success.
      console.error('Error during project/task generation part of onboarding:', genError);
      // Optionally, you could decide to rollback if project/task creation is critical for onboarding success
      // await client.query('ROLLBACK');
      // return res.status(500).json({ message: 'Error generating initial project.', error: genError.message });
    }

    await client.query('COMMIT');

    if (internalUserId) { // Ensure internalUserId is available
        try {
            console.log(`Onboarding complete for user ${internalUserId}, initiating badge check.`);
            await checkAndAwardBadges(internalUserId);
        } catch (badgeError) {
            console.error(`Error during badge check for user ${internalUserId} after onboarding:`, badgeError);
            // Do not let badge errors fail the onboarding response, as onboarding itself was successful.
        }
    }
    
    // Refetch the user to return complete data
    const finalUserResult = await client.query('SELECT id, username, profile_picture, skills, interests FROM users WHERE id = $1', [internalUserId]);

    res.status(200).json({ 
        message: 'Onboarding completed successfully. Initial project created.', 
        user: finalUserResult.rows[0],
        project: newProjectId ? { projectId: newProjectId, projectName: generatedProjectName } : null
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error during onboarding process:', error);
    res.status(500).json({ message: 'Internal server error during onboarding.', error: error.message });
  } finally {
    client.release();
  }
});

router.post('/save', async (req, res) => {
  const { capacity_status } = req.body;
  const userId = req.user.id;
  try {
    const result = await pool.query(
      'UPDATE users SET capacity_status = $1 WHERE id = $2 RETURNING *',
      [capacity_status, userId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
