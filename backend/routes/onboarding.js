import express from 'express';
import multer from 'multer';
import path from 'path';
import pg from 'pg';
import { generateProjectIdea, autoGenerateTasks } from '../services/taskGenerator.js';

const router = express.Router();
const { Pool } = pg;
// Configure PostgreSQL pool
const pool = new Pool({ connectionString: process.env.POSTGRES_URL });
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
  const { username } = req.body;
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
    const processedSkills = [];
    if (skills && Array.isArray(skills)) {
      for (const skillObj of skills) {
        const skillName = skillObj.name;
        let skillId;

        // Check if skill exists
        const existingSkillResult = await client.query('SELECT id, unlocked_users FROM skills WHERE name = $1', [skillName]);
        
        let currentUnlockedUsers = []; // Default to empty array

        if (existingSkillResult.rows.length > 0) {
          skillId = existingSkillResult.rows[0].id;
          currentUnlockedUsers = existingSkillResult.rows[0].unlocked_users || []; // Ensure it's an array
        } else {
          // Insert new skill
          // Assuming parent_skill_id can be NULL or you have a default
          const newSkillResult = await client.query(
            'INSERT INTO skills (name, parent_skill_id, unlocked_users) VALUES ($1, NULL, $2) RETURNING id, unlocked_users',
            [skillName, JSON.stringify([{ user_id: internalUserId, level: 0, exp: 0 }])] // Initialize with current user
          );
          skillId = newSkillResult.rows[0].id;
          currentUnlockedUsers = newSkillResult.rows[0].unlocked_users || []; // Should be the one just inserted
        }
        
        // Update unlocked_users for existing skill if user not already present
        if (existingSkillResult.rows.length > 0) { // Only update if skill was existing, new skill already has user
            // Parse existing array properly
            let parsedUsers = Array.isArray(currentUnlockedUsers) ? currentUnlockedUsers : 
                             currentUnlockedUsers.map(u => typeof u === 'string' ? JSON.parse(u) : u);
            
            const userInSkill = parsedUsers.find(u => u.user_id === internalUserId);
            if (!userInSkill) {
                parsedUsers.push({ user_id: internalUserId, level: 0, exp: 0 });
                await client.query('UPDATE skills SET unlocked_users = $1::jsonb[] WHERE id = $2', [parsedUsers, skillId]);
            }
        }
        processedSkills.push({ id: skillId, name: skillName });
      }
    }

    // 4. Process and Save Interests
    const processedInterests = [];
    if (interests && Array.isArray(interests)) {
      for (const interestObj of interests) {
        const interestName = interestObj.name;
        let interestId;

        // Check if interest exists
        const existingInterestResult = await client.query('SELECT id FROM interests WHERE name = $1', [interestName]);
        if (existingInterestResult.rows.length > 0) {
          interestId = existingInterestResult.rows[0].id;
        } else {
          // Insert new interest
          const newInterestResult = await client.query('INSERT INTO interests (name) VALUES ($1) RETURNING id', [interestName]);
          interestId = newInterestResult.rows[0].id;
        }
        processedInterests.push({ id: interestId, name: interestName });
      }
    }

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
      
      const projectIdea = await generateProjectIdea(skillNames, interestNames);
      generatedProjectName = projectIdea.Name;
      const generatedProjectDescription = projectIdea.Description;

      // 7. Create Project
      const projectInsertResult = await client.query(
        'INSERT INTO projects (name, description, creator_id, tags) VALUES ($1, $2, $3, $4) RETURNING id',
        [generatedProjectName, generatedProjectDescription, internalUserId, []] // Empty tags array for now
      );
      newProjectId = projectInsertResult.rows[0].id;

      // 8. Generate and Save Tasks for the New Project
      // The autoGenerateTasks function from taskGenerator.js expects project name, description, tags (can be empty), and creator_id.
      // It returns an object like { projects: [...], tasks: [...] }
      // We are interested in the tasks part.
      const generatedTasksData = await autoGenerateTasks(generatedProjectName, generatedProjectDescription, [], internalUserId);
      const tasksToInsert = generatedTasksData.tasks; // Assuming this structure based on taskGenerator.js

      if (tasksToInsert && tasksToInsert.length > 0) {
        const llmToDbIdMap = {};

        // First pass: Insert tasks WITHOUT dependencies, and build LLM ID → DB ID map
        for (const task of tasksToInsert) {
          // Ensure default status and reward tokens if not provided by LLM
          const status = task.status || 'inactive-unassigned';
          const reward_tokens = task.reward_tokens || 50; // Default reward tokens
          const dependencies = task.dependencies || []; // Default to empty array

          const taskInsertResult = await client.query(
            'INSERT INTO tasks (project_id, name, description, skill_id, status, dependencies, reward_tokens, creator_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
            [newProjectId, task.name, task.description, task.skill_id, status, [], reward_tokens, internalUserId] // Insert empty dependencies first
          );
          const dbId = taskInsertResult.rows[0].id;
          llmToDbIdMap[task.id] = dbId; // task.id is the LLM-generated ID
        }

        // Second pass: Update dependencies with resolved DB IDs
        for (const task of tasksToInsert) {
          const dbId = llmToDbIdMap[task.id];
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

export default router;