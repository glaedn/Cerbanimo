/**
 * Calculates the experience needed for the next level.
 * This is a placeholder and can be adjusted based on actual game mechanics.
 * @param {number} currentLevel - The current level of the affinity.
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
 * @param {string | string[] | Object[]} unlockedUsersInput - The raw unlocked_users data from the affinity.
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
 * Processes raw affinity data to filter for the current user and categorize affinities.
 * @param {Array<Object>} allAffinities - Array of all affinity objects from the API.
 * @param {string} currentUserId - The ID of the current user.
 * @returns {Array<Object>} - Processed and categorized affinity data for D3.
 */
export const processAffinityDataForGalaxy = (allAffinities, currentUserId) => {
  if (!allAffinities || !currentUserId) {
    return [];
  }

  const allAffinitiesMap = new Map();
  allAffinities.forEach(affinity => {
    allAffinitiesMap.set(affinity.id, { ...affinity });
  });

  const affinitiesToProcess = new Map();

  // Add all user-unlocked affinities
  allAffinities.forEach(affinity => {
    const parsedUsers = parseUnlockedUsers(affinity.unlocked_users);
    const userData = parsedUsers.find(u => u.user_id?.toString() === currentUserId?.toString());
    if (userData) {
      affinitiesToProcess.set(affinity.id, {
        ...affinity,
        userLevel: userData.level,
        userExperience: userData.experience,
        experienceNeededForNextLevel: calculateExperienceNeeded(userData.level),
        isUnlockedByUser: true, // Mark as directly unlocked
      });
    }
  });

  // Add necessary parent affinities for hierarchy completion
  // Iterate over a copy of keys if modifying the map during iteration, or use a temporary array.
  const affinitiesToConsiderForParents = Array.from(affinitiesToProcess.values());
  affinitiesToConsiderForParents.forEach(affinity => {
    let current = affinity;
    while (current && current.parent_affinity_id) {
      if (!affinitiesToProcess.has(current.parent_affinity_id)) {
        const parentAffinity = allAffinitiesMap.get(current.parent_affinity_id);
        if (parentAffinity) {
          affinitiesToProcess.set(parentAffinity.id, {
            ...parentAffinity,
            userLevel: 0, // Default for structural parents not unlocked by user
            userExperience: 0,
            experienceNeededForNextLevel: calculateExperienceNeeded(0),
            isUnlockedByUser: false,
          });
          current = parentAffinity; // Move up to the next parent
        } else {
          console.warn(`Parent affinity with ID ${current.parent_affinity_id} not found in allAffinitiesMap.`);
          break; // Parent not found, stop ascending
        }
      } else {
        // Parent already in affinitiesToProcess, stop ascending this path
        current = affinitiesToProcess.get(current.parent_affinity_id); // ensure current is updated from the map for next iteration
        // break; // This was causing issues if a parent was added by another branch earlier
      }
    }
  });
  

  const processedAffinitiesArray = Array.from(affinitiesToProcess.values());
  const affinityHierarchy = new Map(processedAffinitiesArray.map(s => [s.id, { ...s, children: [], category: 'unknown' }]));

  // Build children arrays first
  affinityHierarchy.forEach(affinityNode => {
    if (affinityNode.parent_affinity_id) {
      const parentNode = affinityHierarchy.get(affinityNode.parent_affinity_id);
      if (parentNode) {
        parentNode.children.push(affinityNode);
      } else {
        // This warning is valid if a parent_affinity_id points to a affinity not included in affinitiesToProcess
        console.warn(`Structural issue: Parent node with ID ${affinityNode.parent_affinity_id} for affinity ${affinityNode.name} (ID: ${affinityNode.id}) not found in affinityHierarchy. This affinity might be orphaned or data needs checking.`);
      }
    }
  });

  // Pass 1: Categorize Stars
  affinityHierarchy.forEach(affinityNode => {
    if (affinityNode.parent_affinity_id === null || affinityNode.parent_affinity_id === undefined) {
      affinityNode.category = 'star';
    }
  });

  // Pass 2: Categorize Planets
  affinityHierarchy.forEach(affinityNode => {
    if (affinityNode.parent_affinity_id) {
      const parentNode = affinityHierarchy.get(affinityNode.parent_affinity_id);
      if (parentNode && parentNode.category === 'star') {
        affinityNode.category = 'planet';
      }
    }
  });

  // Pass 3: Categorize Moons
  affinityHierarchy.forEach(affinityNode => {
    if (affinityNode.parent_affinity_id) {
      const parentNode = affinityHierarchy.get(affinityNode.parent_affinity_id);
      if (parentNode && parentNode.category === 'planet') {
        affinityNode.category = 'moon';
      }
    }
  });

  // ADD THIS NEW PASS: Categorize Satellites (children of Moons)
  affinityHierarchy.forEach(affinityNode => {
    if (affinityNode.parent_affinity_id) {
      const parentNode = affinityHierarchy.get(affinityNode.parent_affinity_id);
      if (parentNode && parentNode.category === 'moon') {
        affinityNode.category = 'satellite'; // New category
      }
    }
  });
  
  // Final check for uncategorized affinities
  affinityHierarchy.forEach(affinityNode => {
    // Update the warning message if 'unknown' is still possible for other reasons
    if (affinityNode.category === 'unknown') {
      console.warn(`Affinity ${affinityNode.name} (ID: ${affinityNode.id}, parent ID: ${affinityNode.parent_affinity_id}) remains uncategorized. This could be an orphan with an unresolved parent link or a new unhandled depth.`);
    } else if (affinityNode.parent_affinity_id && !affinityHierarchy.has(affinityNode.parent_affinity_id) && affinityNode.category !== 'star') {
      console.warn(`Affinity ${affinityNode.name} (ID: ${affinityNode.id}) is categorized as ${affinityNode.category} but its parent (ID: ${affinityNode.parent_affinity_id}) is missing from affinityHierarchy.`);
    }
  });


  // Calculate levelForColor
  const finalOutputAffinities = [];
  affinityHierarchy.forEach(affinity => {
    let calculatedLevel = affinity.userLevel || 0; // Default to its own level

    if (affinity.category === 'star') {
      let starLevelSum = affinity.isUnlockedByUser ? affinity.userLevel : 0; // Start with star's own level if unlocked

      // Traverse children (planets) and grandchildren (moons)
      affinity.children.forEach(planet => { // planets
        if (planet.isUnlockedByUser) {
          starLevelSum += planet.userLevel;
        }
        const planetNode = affinityHierarchy.get(planet.id); // Get full planet node with its children
        planetNode.children.forEach(moon => { // moons
          if (moon.isUnlockedByUser) {
            starLevelSum += moon.userLevel;
          }
        });
      });
      calculatedLevel = starLevelSum;
    }
    
    finalOutputAffinities.push({
      ...affinity, // includes original properties, userLevel, userExperience, etc.
      category: affinity.category || 'unknown', // Ensure category is set
      levelForColor: calculatedLevel,
      // Remove children property from final output as it was for calculation internal to this function
      children: undefined 
    });
  });
  
  // Remove the children property from the final output objects cleanly
  const cleanedFinalOutputAffinities = finalOutputAffinities.map(affinity => {
    const { children, ...rest } = affinity;
    return rest;
  });

  return cleanedFinalOutputAffinities;
};
