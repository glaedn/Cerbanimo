/**
 * Calculates the experience needed for the next level.
 * This is a placeholder and can be adjusted based on actual game mechanics.
 * @param {number} currentLevel - The current level of the capability.
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
 * @param {string | string[] | Object[]} unlockedUsersInput - The raw unlocked_users data from the capability.
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
        // Given `capabilities.unlocked_users (content format: {"{"exp": 0,...}","{"level": 2,...}"})`
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
 * Processes raw capability data to filter for the current user and categorize capabilities.
 * @param {Array<Object>} allCapabilities - Array of all capability objects from the API.
 * @param {string} currentUserId - The ID of the current user.
 * @returns {Array<Object>} - Processed and categorized capability data for D3.
 */
export const processCapabilityDataForGalaxy = (allCapabilities, currentUserId) => {
  if (!allCapabilities || !currentUserId) {
    return [];
  }

  const allCapabilitiesMap = new Map();
  allCapabilities.forEach(capability => {
    allCapabilitiesMap.set(capability.id, { ...capability });
  });

  const capabilitiesToProcess = new Map();

  // Add all user-unlocked capabilities
  allCapabilities.forEach(capability => {
    const parsedUsers = parseUnlockedUsers(capability.unlocked_users);
    const userData = parsedUsers.find(u => u.user_id?.toString() === currentUserId?.toString());
    if (userData) {
      capabilitiesToProcess.set(capability.id, {
        ...capability,
        userLevel: userData.level,
        userExperience: userData.experience,
        experienceNeededForNextLevel: calculateExperienceNeeded(userData.level),
        isUnlockedByUser: true, // Mark as directly unlocked
      });
    }
  });

  // Add necessary parent capabilities for hierarchy completion
  // Iterate over a copy of keys if modifying the map during iteration, or use a temporary array.
  const capabilitiesToConsiderForParents = Array.from(capabilitiesToProcess.values());
  capabilitiesToConsiderForParents.forEach(capability => {
    let current = capability;
    while (current && current.parent_capability_id) {
      if (!capabilitiesToProcess.has(current.parent_capability_id)) {
        const parentCapability = allCapabilitiesMap.get(current.parent_capability_id);
        if (parentCapability) {
          capabilitiesToProcess.set(parentCapability.id, {
            ...parentCapability,
            userLevel: 0, // Default for structural parents not unlocked by user
            userExperience: 0,
            experienceNeededForNextLevel: calculateExperienceNeeded(0),
            isUnlockedByUser: false,
          });
          current = parentCapability; // Move up to the next parent
        } else {
          console.warn(`Parent capability with ID ${current.parent_capability_id} not found in allCapabilitiesMap.`);
          break; // Parent not found, stop ascending
        }
      } else {
        // Parent already in capabilitiesToProcess, stop ascending this path
        current = capabilitiesToProcess.get(current.parent_capability_id); // ensure current is updated from the map for next iteration
        // break; // This was causing issues if a parent was added by another branch earlier
      }
    }
  });
  

  const processedCapabilitiesArray = Array.from(capabilitiesToProcess.values());
  const capabilityHierarchy = new Map(processedCapabilitiesArray.map(s => [s.id, { ...s, children: [], category: 'unknown' }]));

  // Build children arrays first
  capabilityHierarchy.forEach(capabilityNode => {
    if (capabilityNode.parent_capability_id) {
      const parentNode = capabilityHierarchy.get(capabilityNode.parent_capability_id);
      if (parentNode) {
        parentNode.children.push(capabilityNode);
      } else {
        // This warning is valid if a parent_capability_id points to a capability not included in capabilitiesToProcess
        console.warn(`Structural issue: Parent node with ID ${capabilityNode.parent_capability_id} for capability ${capabilityNode.name} (ID: ${capabilityNode.id}) not found in capabilityHierarchy. This capability might be orphaned or data needs checking.`);
      }
    }
  });

  // Pass 1: Categorize Stars
  capabilityHierarchy.forEach(capabilityNode => {
    if (capabilityNode.parent_capability_id === null || capabilityNode.parent_capability_id === undefined) {
      capabilityNode.category = 'star';
    }
  });

  // Pass 2: Categorize Planets
  capabilityHierarchy.forEach(capabilityNode => {
    if (capabilityNode.parent_capability_id) {
      const parentNode = capabilityHierarchy.get(capabilityNode.parent_capability_id);
      if (parentNode && parentNode.category === 'star') {
        capabilityNode.category = 'planet';
      }
    }
  });

  // Pass 3: Categorize Moons
  capabilityHierarchy.forEach(capabilityNode => {
    if (capabilityNode.parent_capability_id) {
      const parentNode = capabilityHierarchy.get(capabilityNode.parent_capability_id);
      if (parentNode && parentNode.category === 'planet') {
        capabilityNode.category = 'moon';
      }
    }
  });

  // ADD THIS NEW PASS: Categorize Satellites (children of Moons)
  capabilityHierarchy.forEach(capabilityNode => {
    if (capabilityNode.parent_capability_id) {
      const parentNode = capabilityHierarchy.get(capabilityNode.parent_capability_id);
      if (parentNode && parentNode.category === 'moon') {
        capabilityNode.category = 'satellite'; // New category
      }
    }
  });
  
  // Final check for uncategorized capabilities
  capabilityHierarchy.forEach(capabilityNode => {
    // Update the warning message if 'unknown' is still possible for other reasons
    if (capabilityNode.category === 'unknown') {
      console.warn(`Capability ${capabilityNode.name} (ID: ${capabilityNode.id}, parent ID: ${capabilityNode.parent_capability_id}) remains uncategorized. This could be an orphan with an unresolved parent link or a new unhandled depth.`);
    } else if (capabilityNode.parent_capability_id && !capabilityHierarchy.has(capabilityNode.parent_capability_id) && capabilityNode.category !== 'star') {
      console.warn(`Capability ${capabilityNode.name} (ID: ${capabilityNode.id}) is categorized as ${capabilityNode.category} but its parent (ID: ${capabilityNode.parent_capability_id}) is missing from capabilityHierarchy.`);
    }
  });


  // Calculate levelForColor
  const finalOutputCapabilities = [];
  capabilityHierarchy.forEach(capability => {
    let calculatedLevel = capability.userLevel || 0; // Default to its own level

    if (capability.category === 'star') {
      let starLevelSum = capability.isUnlockedByUser ? capability.userLevel : 0; // Start with star's own level if unlocked

      // Traverse children (planets) and grandchildren (moons)
      capability.children.forEach(planet => { // planets
        if (planet.isUnlockedByUser) {
          starLevelSum += planet.userLevel;
        }
        const planetNode = capabilityHierarchy.get(planet.id); // Get full planet node with its children
        planetNode.children.forEach(moon => { // moons
          if (moon.isUnlockedByUser) {
            starLevelSum += moon.userLevel;
          }
        });
      });
      calculatedLevel = starLevelSum;
    }
    
    finalOutputCapabilities.push({
      ...capability, // includes original properties, userLevel, userExperience, etc.
      category: capability.category || 'unknown', // Ensure category is set
      levelForColor: calculatedLevel,
      // Remove children property from final output as it was for calculation internal to this function
      children: undefined 
    });
  });
  
  // Remove the children property from the final output objects cleanly
  const cleanedFinalOutputCapabilities = finalOutputCapabilities.map(capability => {
    const { children, ...rest } = capability;
    return rest;
  });

  return cleanedFinalOutputCapabilities;
};
