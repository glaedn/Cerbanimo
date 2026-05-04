/**
 * Calculates the experience needed for the next level.
 * This is a placeholder and can be adjusted based on actual game mechanics.
 * @param {number} currentLevel - The current level of the skill.
 * @returns {number} - Experience needed for the next level.
 */
export const calculateExperienceNeeded = (currentLevel) => {
  if (currentLevel < 0) return 0; // Or handle as an error
  // For next level, we need exp where level-1 = Math.floor(Math.sqrt(exp / 40))
  // So: (level-1-1)² * 40 = exp needed
  // Simplify: (currentLevel-1)² * 40 = exp needed
  return Math.pow(currentLevel, 2) * 40;
};

/**
 * Parses the unlocked_users field, which is expected to be a string
 * that might represent an array of JSON strings, or a direct JSON array string.
 * Handles cases where unlocked_users might be null, undefined, or malformed.
 * @param {string | string[] | Object[]} unlockedUsersInput - The raw unlocked_users data from the skill.
 * @returns {Array<Object>} - An array of parsed user progress objects, or an empty array if parsing fails or input is empty.
 */
const parseUnlockedUsers = (unlockedUsersInput) => {
  if (!unlockedUsersInput) return [];
  try {
    let users = [];
    // Check if it's an array-like object first
    if (unlockedUsersInput && typeof unlockedUsersInput === 'object' && 'length' in unlockedUsersInput) {
      users = Array.from(unlockedUsersInput);
    } else if (typeof unlockedUsersInput === 'string') {
      // Attempt to parse it as a top-level JSON array string first
      // e.g., '[{"user_id":1,...}, {"user_id":2,...}]'
      try {
        users = JSON.parse(unlockedUsersInput);
      } catch (e) {
        // If that fails, try to handle it as a string representation of multiple JSON objects
        // This was the format in the issue: "{"exp": 0,...}","{"level": 2,...}"
        // This specific format is tricky. A more robust backend format would be preferable.
        // For now, assuming it's a single JSON string per user, within an array, or just one JSON string.
        // Let's assume the input from DB is actually `text[]` in PostgreSQL, meaning `unlockedUsersInput`
        // would be an array of strings if properly fetched by the backend.
        // If it's a single text column with "json1","json2", that's harder.
        // The provided example `{"{"exp": 0,...}"}` looks like a set string representation.
        // Given `skills.unlocked_users (content format: {"{"exp": 0,...}","{"level": 2,...}"})`
        // This looks like a string from postgres representing a TEXT[] array like `{"{json_string_1}", "{json_string_2}"}`
        // Or it could be a single string: `{"json_string_1", "json_string_2"}`.
        // Let's try to match the issue's format: `{"{"exp": 0,...}"}` suggests a set of strings.
        // This is a common way PostgreSQL returns array of strings.
        // Example: '{ "{"user_id":1,"level":1}", "{"user_id":2,"level":2}" }'
        if (unlockedUsersInput.startsWith('{') && unlockedUsersInput.endsWith('}')) {
          const innerContent = unlockedUsersInput.slice(1, -1);
          // This regex attempts to split by '","' but not within JSON strings. It's fragile.
          const potentialJsonStrings = innerContent.split(/,(?![^{]*})/).map(s => s.trim());
          potentialJsonStrings.forEach(str => {
            try {
              // Handle if strings are double-quoted within the array string representation
              const cleanedStr = str.startsWith('"') && str.endsWith('"') ? str.slice(1, -1).replace(/\\"/g, '"') : str.replace(/\\"/g, '"');
              users.push(JSON.parse(cleanedStr));
            } catch (parseError) {
              console.warn('Failed to parse individual JSON string from array:', cleanedStr, parseError);
            }
          });
        } else {
           // Fallback for a single JSON object string
           users.push(JSON.parse(unlockedUsersInput));
        }
      }
    } else if (Array.isArray(unlockedUsersInput)) {
      // If it's already an array (e.g., from a JSONB column or already processed)
      unlockedUsersInput.forEach(item => {
        if (typeof item === 'string') {
          try {
            users.push(JSON.parse(item));
          } catch (e) {
            console.warn('Failed to parse JSON string in array:', item, e);
          }
        } else if (typeof item === 'object') {
          users.push(item);
        }
      });
    } else if (typeof unlockedUsersInput === 'object') {
        // If it's a single object already
        // Ensure it's an object with expected properties
        users.push(unlockedUsersInput);
    }
    // Standardize 'exp' vs 'experience'
    return users.map(u => ({
      ...u,
      experience: u.experience ?? u.exp ?? 0,
      level: u.level ?? 0
    }));
  } catch (error) {
    console.error('Error parsing unlocked_users data:', unlockedUsersInput, error);
    return [];
  }
};


/**
 * Processes raw skill data to filter for the current user and categorize skills.
 * @param {Array<Object>} allSkills - Array of all skill objects from the API.
 * @param {string} currentUserId - The ID of the current user.
 * @returns {Array<Object>} - Processed and categorized skill data for D3.
 */
export const processSkillDataForGalaxy = (allSkills, currentUserId) => {
  if (!allSkills || !currentUserId) {
    return [];
  }

  const allSkillsMap = new Map();
  allSkills.forEach(skill => {
    allSkillsMap.set(skill.id, { ...skill });
  });

  const skillsToProcess = new Map();

  // Add all user-unlocked skills
  allSkills.forEach(skill => {
    const parsedUsers = parseUnlockedUsers(skill.unlocked_users);
    const userData = parsedUsers.find(u => u.user_id?.toString() === currentUserId?.toString());
    if (userData) {
      skillsToProcess.set(skill.id, {
        ...skill,
        userLevel: userData.level,
        userExperience: userData.experience,
        experienceNeededForNextLevel: calculateExperienceNeeded(userData.level),
        isUnlockedByUser: true, // Mark as directly unlocked
      });
    }
  });

  // Add necessary parent skills for hierarchy completion iteratively to guarantee termination and efficiency.
  let newlyAdded = true;
  let safetyCounter = 0;
  const MAX_ITERATIONS = 20; // Maximum hierarchy depth support

  while (newlyAdded && safetyCounter < MAX_ITERATIONS) {
    newlyAdded = false;
    safetyCounter++;

    // Iterate over the current snapshot of skills to process to find their parents
    for (const skill of Array.from(skillsToProcess.values())) {
      const pid = skill.parent_skill_id;

      // If there's a parent that isn't ourselves and hasn't been added yet
      if (pid && pid !== skill.id && !skillsToProcess.has(pid)) {
        const parentSkill = allSkillsMap.get(pid);
        if (parentSkill) {
          skillsToProcess.set(parentSkill.id, {
            ...parentSkill,
            userLevel: 0,
            userExperience: 0,
            experienceNeededForNextLevel: calculateExperienceNeeded(0),
            isUnlockedByUser: false,
          });
          newlyAdded = true;
        } else {
          // Parent ID exists but the skill record is missing from allSkills
          // Mark as orphan internally by clearing parent_skill_id for the categorization pass
          skill.parent_skill_id = null;
        }
      }
    }
  }

  if (safetyCounter >= MAX_ITERATIONS) {
    console.error('[SkillUtils] Safety limit reached during parent discovery. Possible deep circular dependency.');
  }
  

  const processedSkillsArray = Array.from(skillsToProcess.values());
  const skillHierarchy = new Map(processedSkillsArray.map(s => [s.id, { ...s, children: [], category: 'unknown' }]));

  // Build children arrays first
  skillHierarchy.forEach(skillNode => {
    if (skillNode.parent_skill_id && skillNode.parent_skill_id !== skillNode.id) {
      const parentNode = skillHierarchy.get(skillNode.parent_skill_id);
      if (parentNode) {
        parentNode.children.push(skillNode);
      } else {
        // This warning is valid if a parent_skill_id points to a skill not included in skillsToProcess
        console.warn(`Structural issue: Parent node with ID ${skillNode.parent_skill_id} for skill ${skillNode.name} (ID: ${skillNode.id}) not found in skillHierarchy. This skill might be orphaned or data needs checking.`);
      }
    }
  });

  // Pass 1: Categorize Stars
  skillHierarchy.forEach(skillNode => {
    if (
      skillNode.parent_skill_id === null ||
      skillNode.parent_skill_id === undefined ||
      skillNode.parent_skill_id === skillNode.id // 🌟 self = root
    ) {
      skillNode.category = 'star';
    }
  });

  // Pass 2: Categorize Planets
  skillHierarchy.forEach(skillNode => {
    if (skillNode.category !== 'unknown') return;
    if (skillNode.parent_skill_id) {
      const parentNode = skillHierarchy.get(skillNode.parent_skill_id);
      if (parentNode && parentNode.category === 'star') {
        skillNode.category = 'planet';
      }
    }
  });

  // Pass 3: Categorize Moons
  skillHierarchy.forEach(skillNode => {
    if (skillNode.category !== 'unknown') return;
    if (skillNode.parent_skill_id) {
      const parentNode = skillHierarchy.get(skillNode.parent_skill_id);
      if (parentNode && parentNode.category === 'planet') {
        skillNode.category = 'moon';
      }
    }
  });

  // ADD THIS NEW PASS: Categorize Satellites (children of Moons)
  skillHierarchy.forEach(skillNode => {
    if (skillNode.category !== 'unknown') return;
    if (skillNode.parent_skill_id) {
      const parentNode = skillHierarchy.get(skillNode.parent_skill_id);
      if (parentNode && parentNode.category === 'moon') {
        skillNode.category = 'satellite'; // New category
      }
    }
  });
  
  // Final check for uncategorized skills
  skillHierarchy.forEach(skillNode => {
    // Update the warning message if 'unknown' is still possible for other reasons
    if (skillNode.category === 'unknown') {
      console.warn(`Skill ${skillNode.name} (ID: ${skillNode.id}, parent ID: ${skillNode.parent_skill_id}) remains uncategorized. This could be an orphan with an unresolved parent link or a new unhandled depth.`);
    } else if (skillNode.parent_skill_id && !skillHierarchy.has(skillNode.parent_skill_id) && skillNode.category !== 'star') {
      console.warn(`Skill ${skillNode.name} (ID: ${skillNode.id}) is categorized as ${skillNode.category} but its parent (ID: ${skillNode.parent_skill_id}) is missing from skillHierarchy.`);
    }
  });


  // Calculate levelForColor using a more efficient bottom-up or memoized approach
  // Since the hierarchy is shallow (stars -> planets -> moons -> satellites), simple traversal is fine,
  // but we can optimize it slightly.
  const finalOutputSkills = [];

  skillHierarchy.forEach(skill => {
    let calculatedLevel = skill.userLevel || 0;

    if (skill.category === 'star') {
      // For stars, the level is the sum of itself and ALL its descendants' levels
      let starLevelSum = skill.isUnlockedByUser ? skill.userLevel : 0;

      // Recursive sum of child levels with cycle detection
      const visited = new Set();
      const sumDescendants = (node) => {
        if (visited.has(node.id)) return 0;
        visited.add(node.id);

        let sum = 0;
        node.children.forEach(child => {
          if (child.isUnlockedByUser) {
            sum += (child.userLevel || 0);
          }
          // Recursively add grandchildren levels if they are also part of the hierarchy
          const fullChild = skillHierarchy.get(child.id);
          if (fullChild) {
            sum += sumDescendants(fullChild);
          }
        });
        return sum;
      };

      starLevelSum += sumDescendants(skill);
      calculatedLevel = starLevelSum;
    }
    
    finalOutputSkills.push({
      ...skill,
      category: skill.category || 'unknown',
      levelForColor: calculatedLevel,
    });
  });
  
  // Remove the children property from the final output objects cleanly
  const cleanedFinalOutputSkills = finalOutputSkills.map(skill => {
    const { children, ...rest } = skill;
    return rest;
  });

  return cleanedFinalOutputSkills;
};
