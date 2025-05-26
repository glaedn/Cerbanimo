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
      console.log('Parsing unlocked_users as an array:', users);
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
          console.log('Parsing unlocked_users as a set of JSON strings:', innerContent);
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
            console.log('Parsing unlocked_users item as JSON string:', item);
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

  const userSkills = [];

  allSkills.forEach(skill => {
    const parsedUsers = parseUnlockedUsers(skill.unlocked_users);
    const userData = parsedUsers.find(u => u.user_id?.toString() === currentUserId?.toString());
    if (userData) {
      console.log(`User ${currentUserId} has unlocked skill: ${skill.name}`);
      userSkills.push({
        ...skill,
        userLevel: userData.level,
        userExperience: userData.experience,
        experienceNeededForNextLevel: calculateExperienceNeeded(userData.level),
      });
    }
  });

  // Filter out parent skills if a child skill is unlocked by the user
  // The issue states: "remove all skills where the user is not in the unlocked_users column 
  // OR is the parent of a skill that has the user in the unlocked_users column"
  // This means if a user has unlocked a "child" skill, its "parent" should not also be listed as an achieved skill.
  // The parent still exists structurally for the galaxy map but isn't an "endpoint" node for the user.
  const unlockedSkillIds = new Set(userSkills.map(s => s.id));
  console.log('User Skills:', userSkills);
  const parentSkills = allSkills.filter(skill => {
    const isParentOfUnlockedSkill = allSkills.some(otherSkill => 
          otherSkill.parent_skill_id === skill.id && unlockedSkillIds.has(otherSkill.id)
      );
      if (isParentOfUnlockedSkill) {
        return true;
      }
    });
  console.log('Parent Skills:', parentSkills);
  const skillsToDisplay = userSkills.filter(skill => {
      // Check if this skill is a parent of ANY other skill the user has unlocked.
      const isParentOfUnlockedChild = userSkills.some(childSkill => 
        childSkill.parent_skill_id === skill.id && 
        childSkill.userLevel !== undefined && 
        childSkill.userLevel > 0
      );
      // If it's a parent of an unlocked skill, it should not be displayed directly as one of "user's skills"
      if (isParentOfUnlockedChild) { 
        console.log(`Filtering out parent skill ${skill.name} because it has unlocked children.`);
        return false;
      }
            
      // unless it's a top-level star, which forms the basis of the constellation.
      // The categorization logic below will handle this better.
      // For now, this filter seems to conflict with the star/planet/moon idea if stars are parents.
      // Let's re-evaluate this specific filter after categorization.
      // The core idea is: if you unlocked "Moon Skill", "Planet Skill" (its parent) shouldn't show as a separate unlocked node *unless* it's a star.
      // This rule might be better interpreted as: don't show intermediate parents as "achievements" if a more specific child is achieved.
      // The star/planet/moon categorization naturally handles this by giving them different visual roles.
      // So, we will rely on the categorization.
      return true; 
  });
  console.log('parentSkills:', parentSkills);

  

  const categorizedSkills = [];
  const skillMap = new Map(skillsToDisplay.map(s => [s.id, s]));
  console.log('Skills to display:', skillsToDisplay);
  // Categorize Stars (top-level skills)
  if (!skillsToDisplay) return [];  // Early return if no skills

  // Categorize Stars (top-level skills)
  parentSkills.forEach(skill => {
    if (!skill) return;  // Skip if skill is undefined
    if (skill.parent_skill_id === null || skill.parent_skill_id === undefined) {
      console.log(`Categorizing skill ${skill.name} as a star`);
      categorizedSkills.push({
        ...skill,
        category: 'star',
        levelForColor: skill.userLevel || 0, 
      });
    }
  });

  //if (!categorizedSkills.length) return [];  // Early return if no stars found

  const starIds = new Set(categorizedSkills.filter(s => s && s.category === 'star').map(s => s.id));  
  console.log ('skills to display after star categorization:', skillsToDisplay);
  // Categorize Planets (children of stars)
  parentSkills.forEach(skill => {
    if (!skill) return;  // Skip if skill is undefined
    console.log(`Processing skill ${skill.name} for categorization`);
    if (skill.parent_skill_id !== null) {
      console.log(`Categorizing skill ${skill.name} as a planet under star ${skill.parent_skill_id}`);
      categorizedSkills.push({
        ...skill,
        category: 'planet',
        levelForColor: skill.userLevel,
      });
    }
  });

  skillsToDisplay.forEach(skill => {
    if (!skill) return;
    console.log(`Categorizing skill ${skill.name} as a planet under star ${skill.parent_skill_id}`);
    // if the skill is child of a star
    if (skill.parent_skill_id !== null && starIds.has(skill.parent_skill_id)) {
    categorizedSkills.push({
        ...skill,
        category: 'planet',
        levelForColor: skill.userLevel,
      });
    }
  });


    const planetIds = new Set(categorizedSkills.filter(s => s && s.category === 'planet').map(s => s.id));

  // Categorize Moons (children of planets)
  skillsToDisplay.forEach(skill => {
    if (!skill) return;  // Skip if skill is undefined
    if (skill.parent_skill_id !== null && planetIds.has(skill.parent_skill_id)) {
        categorizedSkills.push({
          ...skill,
          category: 'moon',
          levelForColor: skill.userLevel,
        });
        console.log(`Categorizing skill ${skill.name} as a moon under planet ${skill.parent_skill_id}`);
    }
  });

  
  // The filtering rule: "remove all skills where the user is ... the parent of a skill that has the user in the unlocked_users column"
  // This means if a skill is a parent to *any other displayed skill*, it should be removed *if it's not a star*.
  // Example: User unlocked Skill C (moon). Parent is B (planet). Parent of B is A (star).
  // A is shown. B is shown. C is shown.
  // If user unlocks B (planet) and C (moon of B), B is not removed.
  // If user unlocks only B (planet), and B has no children unlocked by user, B is shown.
  // The rule is to avoid redundancy. If "Child Skill" is unlocked, don't *also* show "Parent Category Skill" as a separate achievement node *unless* that parent is a Star.
  // This means: planets that are parents of other displayed planets or moons should be fine.
  // Stars that are parents of displayed planets are fine.
  // The original interpretation of the filter might be too aggressive.
  // The current star/planet/moon categorization should suffice.
  // Let's ensure no duplicates if a skill could be matched by multiple categories (though current logic prevents this).
  const finalSkills = Array.from(new Map(categorizedSkills.map(s => [s.id, s])).values());
  console.log('Final categorized skills:', finalSkills);
  return finalSkills;
};
