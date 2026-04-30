import pool from '../db.js';

/**
 * Processes a list of skills for a user.
 * Skips blacklisted skills.
 * Existing skills are used as is.
 * New skills are created with 'pending' status.
 * Returns an array of skill objects { id, name }.
 */
export const processSkills = async (skills, userId, client = pool) => {
  const processedSkills = [];
  if (!skills || !Array.isArray(skills)) return processedSkills;

  for (const skill of skills) {
    const skillName = typeof skill === 'string' ? skill : skill.name;
    if (!skillName) continue;

    // Check if skill exists (case-insensitive)
    const existingSkillResult = await client.query(
      'SELECT id, name, status FROM skills WHERE LOWER(name) = LOWER($1)',
      [skillName]
    );

    let skillId;
    let finalSkillName = skillName;
    if (existingSkillResult.rows.length > 0) {
      const existing = existingSkillResult.rows[0];
      if (existing.status === 'blacklisted') {
        console.log(`Skipping blacklisted skill: ${skillName}`);
        continue;
      }
      skillId = existing.id;
      finalSkillName = existing.name;
    } else {
      // Insert new skill as pending
      const newSkillResult = await client.query(
        'INSERT INTO skills (name, status, creator_id) VALUES ($1, $2, $3) RETURNING id',
        [skillName, 'pending', userId]
      );
      skillId = newSkillResult.rows[0].id;
    }
    processedSkills.push({ id: skillId, name: finalSkillName });
  }

  return processedSkills;
};
