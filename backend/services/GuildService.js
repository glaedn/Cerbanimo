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
}

export default new GuildService();
