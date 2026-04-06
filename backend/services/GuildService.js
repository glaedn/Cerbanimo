import pool from '../db.js';

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

  async addMember(guildId, userId, role = 'Apprentice') {
    const query = `
      INSERT INTO guild_memberships (guild_id, user_id, role)
      VALUES ($1, $2, $3)
      ON CONFLICT (guild_id, user_id) DO UPDATE SET role = EXCLUDED.role
      RETURNING *;
    `;
    const result = await pool.query(query, [guildId, userId, role]);

    // Increment member count
    await pool.query(
      'UPDATE guilds SET member_count = member_count + 1 WHERE id = $1',
      [guildId]
    );

    return result.rows[0];
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
      // Progression is driven purely by story patterns (skill level handles XP)

      if (currentRole === 'Apprentice') {
        // Apprentice -> Specialist: Needs some 'Finisher' or 'Specialist' pattern
        if (patterns['Finisher'] > 0.3 || patterns['Specialist'] > 0.3) {
          nextRole = 'Specialist';
        }
      } else if (currentRole === 'Specialist') {
        // Specialist -> Architect: Needs strong 'Specialist' pattern
        if (patterns['Specialist'] > 0.6) {
          nextRole = 'Architect';
        }
      } else if (currentRole === 'Architect') {
        // Architect -> Mentor: Needs 'Verifier' pattern (suggesting they can guide others)
        if (patterns['Verifier'] > 0.5) {
          nextRole = 'Mentor';
        }
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

        const memberQuery = 'SELECT 1 FROM guild_memberships WHERE guild_id = $1 AND user_id = $2';
        const memberRes = await pool.query(memberQuery, [guildId, parsedEntry.user_id]);

        if (memberRes.rows.length === 0) {
          await this.addMember(guildId, parsedEntry.user_id);
          addedCount++;
        }
      }
    }
    console.log(`Membership synchronization complete. Added ${addedCount} new memberships.`);
    return addedCount;
  }
}

export default new GuildService();
