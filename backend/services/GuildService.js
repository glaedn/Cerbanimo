import pool from '../db.js';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { parseLLMJsonResponse } from "./taskGenerator.js";

class GuildService {
  async autoCreateGuild(skillId, skillName, description = '') {
    const query = `
      INSERT INTO guilds (skill_id, name, description, status)
      VALUES ($1, $2, $3, 'forming')
      ON CONFLICT (skill_id) DO NOTHING
      RETURNING *;
    `;
    const result = await pool.query(query, [skillId, skillName, description]);
    return result.rows[0];
  }

  async addMember(guildId, userId, role = 'Apprentice', xp = 0) {
    const query = `
      INSERT INTO guild_memberships (guild_id, user_id, role, xp)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (guild_id, user_id) DO UPDATE SET
        role = EXCLUDED.role,
        xp = GREATEST(guild_memberships.xp, EXCLUDED.xp)
      RETURNING *, (xmax = 0) AS is_new;
    `;
    const result = await pool.query(query, [guildId, userId, role, xp]);

    // Increment member count if it's a new membership
    if (result.rows[0].is_new) {
      await pool.query(
        'UPDATE guilds SET member_count = member_count + 1 WHERE id = $1',
        [guildId]
      );
    }

    return result.rows[0];
  }

  async getOrCreateSkill(skillName) {
    if (!skillName) return null;

    // Case-insensitive search
    const skillResult = await pool.query('SELECT id FROM skills WHERE LOWER(name) = LOWER($1)', [skillName]);

    if (skillResult.rows.length > 0) {
      return skillResult.rows[0].id;
    }

    // Create new skill
    const newSkillResult = await pool.query(
      'INSERT INTO skills (name) VALUES ($1) RETURNING id',
      [skillName]
    );
    const skillId = newSkillResult.rows[0].id;

    // Also auto-create a guild for this new skill
    try {
      await this.autoCreateGuild(skillId, skillName);
    } catch (guildError) {
      console.error(`Failed to auto-create guild for new skill "${skillName}":`, guildError);
    }

    return skillId;
  }

  async requestNewSkill(requesterId, skillName, description) {
    const query = `
      INSERT INTO skill_requests (requester_id, skill_name, description)
      VALUES ($1, $2, $3)
      RETURNING *;
    `;
    const result = await pool.query(query, [requesterId, skillName, description]);
    return result.rows[0];
  }

  async voteOnSkillRequest(requestId, userId, approve = true) {
    const field = approve ? 'approvals' : 'denials';
    const query = `
      UPDATE skill_requests
      SET ${field} = array_append(${field}, $1)
      WHERE id = $2
      RETURNING *;
    `;
    const result = await pool.query(query, [userId, requestId]);
    const request = result.rows[0];

    // Auto-approve if 3 approvals
    if (request.approvals.length >= 3) {
      await this.approveSkillRequest(requestId);
    } else if (request.denials.length >= 3) {
       await pool.query("UPDATE skill_requests SET status = 'denied' WHERE id = $1", [requestId]);
    }

    return request;
  }

  async approveSkillRequest(requestId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const requestQuery = 'SELECT skill_name, description FROM skill_requests WHERE id = $1';
      const requestResult = await client.query(requestQuery, [requestId]);
      const { skill_name, description } = requestResult.rows[0];

      // Create skill in skills table
      const createSkillQuery = 'INSERT INTO skills (name, description) VALUES ($1, $2) RETURNING id';
      const skillResult = await client.query(createSkillQuery, [skill_name, description]);
      const skillId = skillResult.rows[0].id;

      // Create guild for the new skill
      await this.autoCreateGuild(skillId, skill_name, description);

      await client.query("UPDATE skill_requests SET status = 'approved' WHERE id = $1", [requestId]);

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getGuildIntelligence(guildId) {
     const query = `
      SELECT * FROM guild_metrics WHERE guild_id = $1 ORDER BY recorded_at DESC LIMIT 1;
    `;
    const result = await pool.query(query, [guildId]);
    return result.rows[0];
  }

  async getGuildIntelligenceBySkillId(skillId) {
    const query = `
      SELECT gm.* FROM guild_metrics gm
      JOIN guilds g ON gm.guild_id = g.id
      WHERE g.skill_id = $1
      ORDER BY gm.recorded_at DESC LIMIT 1;
    `;
    const result = await pool.query(query, [skillId]);
    return result.rows[0];
  }

  async syncUserRanks(userId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const membershipsQuery = 'SELECT guild_id FROM guild_memberships WHERE user_id = $1';
      const membershipsResult = await client.query(membershipsQuery, [userId]);

      const results = [];
      for (const row of membershipsResult.rows) {
        const nextRole = await this.updateCareerProgression(userId, row.guild_id);
        results.push({ guildId: row.guild_id, role: nextRole });
      }

      await client.query('COMMIT');
      return results;
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error syncing user ranks:', err);
      throw err;
    } finally {
      client.release();
    }
  }

  async updateCareerProgression(userId, guildId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get user's current membership
      const membershipQuery = 'SELECT role, xp FROM guild_memberships WHERE user_id = $1 AND guild_id = $2 FOR UPDATE';
      const membershipResult = await client.query(membershipQuery, [userId, guildId]);

      if (membershipResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      const { role: currentRole, xp } = membershipResult.rows[0];

      // Get user's patterns for this skill
      const patternsQuery = `
        SELECT pattern, strength FROM user_patterns
        WHERE user_id = $1 AND pattern IN ('Finisher', 'Specialist', 'Verifier')
      `;
      const patternsResult = await client.query(patternsQuery, [userId]);
      const patterns = patternsResult.rows.reduce((acc, p) => ({ ...acc, [p.pattern]: parseFloat(p.strength) }), {});

      let nextRole = currentRole;

      // Logic for Career Path Progression: Apprentice → Specialist → Architect → Mentor

      // XP-based progression (overrides pattern-based if higher)
      if (xp >= 10000) nextRole = 'Mentor';
      else if (xp >= 6000) nextRole = 'Architect';
      else if (xp >= 3000) nextRole = 'Specialist';
      else if (xp >= 1000) nextRole = 'Apprentice';

      // Fallback/Legacy pattern-based progression
      if (nextRole === 'Apprentice' || !nextRole) {
        if (patterns['Finisher'] > 0.3 || patterns['Specialist'] > 0.3) {
          nextRole = 'Specialist';
        }
      }

      if (nextRole === 'Specialist' && patterns['Specialist'] > 0.6) {
        nextRole = 'Architect';
      }

      if (nextRole === 'Architect' && patterns['Verifier'] > 0.5) {
        nextRole = 'Mentor';
      }

      // Ensure we don't demote
      const roleOrder = ['Apprentice', 'Specialist', 'Architect', 'Mentor'];
      if (roleOrder.indexOf(nextRole) < roleOrder.indexOf(currentRole)) {
        nextRole = currentRole;
      }

      if (nextRole !== currentRole) {
        await client.query(
          'UPDATE guild_memberships SET role = $1 WHERE user_id = $2 AND guild_id = $3',
          [nextRole, userId, guildId]
        );
        console.log(`User ${userId} promoted to ${nextRole} in guild ${guildId}`);
      }

      await client.query('COMMIT');
      return nextRole;
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error updating career progression:', err);
      throw err;
    } finally {
      client.release();
    }
  }

  async syncGuildsWithSkills() {
    console.log('Synchronizing guilds with skills...');
    const skillsQuery = 'SELECT id, name, description FROM skills';
    const skillsResult = await pool.query(skillsQuery);

    let createdCount = 0;
    for (const skill of skillsResult.rows) {
      const guild = await this.autoCreateGuild(skill.id, skill.name, skill.description);
      if (guild) createdCount++;
    }

    console.log(`Synchronization complete. Created ${createdCount} new guilds.`);
    return createdCount;
  }

  async syncMembershipsWithSkills() {
    console.log('Synchronizing guild memberships with unlocked skills...');
    const skillsQuery = 'SELECT id, unlocked_users FROM skills';
    const skillsResult = await pool.query(skillsQuery);

    let addedCount = 0;
    let updatedCount = 0;
    for (const skill of skillsResult.rows) {
      if (!skill.unlocked_users || skill.unlocked_users.length === 0) continue;

      const guildQuery = 'SELECT id FROM guilds WHERE skill_id = $1';
      const guildRes = await pool.query(guildQuery, [skill.id]);
      if (guildRes.rows.length === 0) continue;
      const guildId = guildRes.rows[0].id;

      for (const entry of skill.unlocked_users) {
        let parsedEntry = entry;
        if (typeof entry === 'string') {
          try {
            parsedEntry = JSON.parse(entry);
          } catch (e) {
            try {
              parsedEntry = JSON.parse(entry.replace(/\\"/g, '"').replace(/^"{|}"}$/g, ""));
            } catch (e2) { continue; }
          }
        }

        if (!parsedEntry || !parsedEntry.user_id) continue;

        const xp = parsedEntry.exp || 0;
        // In the future, we could determine role based on level here,
        // but for now we'll stick with Apprentice and let updateCareerProgression handle it.
        const member = await this.addMember(guildId, parsedEntry.user_id, 'Apprentice', xp);

        if (member.is_new) {
          addedCount++;
        } else {
          updatedCount++;
        }
      }
    }
    console.log(`Membership synchronization complete. Added ${addedCount} new memberships, updated ${updatedCount}.`);
    return { addedCount, updatedCount };
  }

  async matchSkillsHierarchy() {
    console.log('Running automated skill hierarchy matching...');
    try {
      // 1. Get "new" skills (no parent)
      const newSkillsResult = await pool.query('SELECT id, name FROM skills WHERE parent_skill_id IS NULL');
      const newSkills = newSkillsResult.rows;

      if (newSkills.length === 0) {
        console.log('No new skills to match.');
        return;
      }

      // 2. Get "parent" skills (skills that have children)
      const parentSkillsResult = await pool.query(`
        SELECT DISTINCT p.id, p.name
        FROM skills p
        JOIN skills c ON c.parent_skill_id = p.id
      `);
      const parentSkills = parentSkillsResult.rows;

      // 3. Query Gemini
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemma-3-27b-it" });

      const prompt = `
        You are an expert in skill taxonomies and workforce development.
        Your task is to organize a list of "new skills" into an existing hierarchy of "parent skills".

        New Skills:
        ${JSON.stringify(newSkills)}

        Existing Parent Skills:
        ${JSON.stringify(parentSkills)}

        Instructions:
        1. For each "new skill", find the most appropriate "parent skill" from the existing list.
        2. If no existing parent skill is a good fit, you may suggest a "new parent skill" name that would be a better fit for the new skill (and potentially others).
        3. Return a JSON array of objects with the following structure:
           [
             { "skill_id": 123, "parent_skill_id": 456, "suggested_parent_name": null },
             { "skill_id": 789, "parent_skill_id": null, "suggested_parent_name": "New Category Name" }
           ]
        4. Focus on logical categorization (e.g., "React" -> "Web Development", "Logo Design" -> "Graphic Design").

        ONLY return the JSON array.
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      const mappings = parseLLMJsonResponse(text);

      // 4. Update Database
      for (const mapping of mappings) {
        let parentId = mapping.parent_skill_id;

        if (!parentId && mapping.suggested_parent_name) {
          // Check if suggested parent already exists
          const existingParent = await pool.query('SELECT id FROM skills WHERE name = $1', [mapping.suggested_parent_name]);
          if (existingParent.rows.length > 0) {
            parentId = existingParent.rows[0].id;
          } else {
            // Create new parent skill
            const newParent = await pool.query('INSERT INTO skills (name) VALUES ($1) RETURNING id', [mapping.suggested_parent_name]);
            parentId = newParent.rows[0].id;
            // Also create a guild for the new parent
            await this.autoCreateGuild(parentId, mapping.suggested_parent_name);
          }
        }

        if (parentId) {
          await pool.query('UPDATE skills SET parent_skill_id = $1 WHERE id = $2', [parentId, mapping.skill_id]);
          console.log(`Matched skill ${mapping.skill_id} to parent ${parentId}`);
        }
      }

      console.log('Skill hierarchy matching complete.');
    } catch (err) {
      console.error('Error in matchSkillsHierarchy:', err);
    }
  }
}

export default new GuildService();
