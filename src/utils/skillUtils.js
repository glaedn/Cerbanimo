/**
 * Calculates the experience needed for the next level.
 * This is a placeholder and can be adjusted based on actual game mechanics.
 * @param {number} currentLevel - The current level of the skill.
 * @returns {number} - Experience needed for the next level.
 */
export const calculateExperienceNeeded = (currentLevel) => {
  if (currentLevel < 0) return 0; // Or handle as an error
  return (currentLevel + 1) * 100 + 50; // Example: Level 0 needs 50, Level 1 needs 150
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
    if (typeof unlockedUsersInput === 'string') {
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
        users.push(unlockedUsersInput);
    }
    // Standardize 'exp' vs 'experience'
    return users.map(u => ({ ...u, experience: u.experience ?? u.exp ?? 0, level: u.level ?? 0 }));
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
  const skillsToDisplay = userSkills.filter(skill => {
      // Check if this skill is a parent of ANY other skill the user has unlocked.
      const isParentOfUnlockedSkill = userSkills.some(otherSkill => {
          return otherSkill.parent_skill_id === skill.id;
      });
      // If it's a parent of an unlocked skill, it should not be displayed directly as one of "user's skills"
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


  const categorizedSkills = [];
  const skillMap = new Map(skillsToDisplay.map(s => [s.id, s]));

  // Categorize Stars (top-level skills)
  skillsToDisplay.forEach(skill => {
    if (skill.parent_skill_id === null || skill.parent_skill_id === undefined) {
      categorizedSkills.push({
        ...skill,
        category: 'star',
        // Stars (top-level skills) don't have a user-specific level as per issue.
        // However, the issue also says "stars should be neon colors ... representing different skill thresholds (like 1 - 5, ... up to level 20)"
        // This is contradictory. For now, let's assume if a star is "unlocked" (i.e., one of its children is), it gets a base level or status.
        // Or, the level here refers to the *highest level achieved in any of its children*.
        // Given the `unlocked_users` is on the skill itself, a star *can* have a level if users can unlock it directly.
        // Let's assume `userLevel` on a star means the user has directly interacted with/unlocked aspects of this broad category.
        // If top-level skills truly have no level, color coding them by level is impossible.
        // Clarification: "Top-level skills should have no level." - this likely means they don't have their *own* independent level progression track in the same way planets/moons do.
        // They represent broad categories. Their "level" for color coding might be an aggregation or fixed.
        // For now, if a star has `userLevel` from `unlocked_users`, we use it. Otherwise, default to 0 for color calculation.
        levelForColor: skill.userLevel || 0, 
      });
    }
  });

  const starIds = new Set(categorizedSkills.filter(s => s.category === 'star').map(s => s.id));

  // Categorize Planets (children of stars)
  skillsToDisplay.forEach(skill => {
    if (skill.parent_skill_id !== null && starIds.has(skill.parent_skill_id)) {
      categorizedSkills.push({
        ...skill,
        category: 'planet',
        levelForColor: skill.userLevel,
      });
    }
  });

  const planetIds = new Set(categorizedSkills.filter(s => s.category === 'planet').map(s => s.id));

  // Categorize Moons (children of planets)
  skillsToDisplay.forEach(skill => {
    if (skill.parent_skill_id !== null && planetIds.has(skill.parent_skill_id)) {
      // Ensure it's not already categorized as a star or planet (edge case: a skill being both a child and a parent in the list)
      if (!starIds.has(skill.id) && !planetIds.has(skill.id)) {
        categorizedSkills.push({
          ...skill,
          category: 'moon',
          levelForColor: skill.userLevel,
        });
      }
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

  return finalSkills;
};
