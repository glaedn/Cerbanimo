import pool from './db.js';

const seedNarrativeData = async () => {
  try {
    // 1. Get a user
    const userRes = await pool.query('SELECT id FROM users LIMIT 1');
    if (userRes.rows.length === 0) {
      console.log('No users found to seed narrative data.');
      return;
    }
    const userId = userRes.rows[0].id;

    // 2. Get some skills
    const skillRes = await pool.query('SELECT id FROM skills LIMIT 3');
    const skillIds = skillRes.rows.map(r => r.id);

    // 3. Create a story node if none exists
    const storyNodeRes = await pool.query(`
      INSERT INTO story_nodes (user_id, title, reflection, story_type, impact_label, impact_weight)
      VALUES ($1, 'Winter Shelter Support', 'Coordinated logistics for 50 people during the freeze.', 'crisis', 'Regional Stability', 85)
      RETURNING id
    `, [userId]);
    const storyNodeId = storyNodeRes.rows[0].id;

    // 4. Seed Mentorship
    if (userRes.rows.length > 1) {
        const otherUserId = (await pool.query('SELECT id FROM users WHERE id != $1 LIMIT 1', [userId])).rows[0].id;
        await pool.query(`
            INSERT INTO mentorship_relations (mentor_id, mentee_id, skill_id, story_node_id, context)
            VALUES ($1, $2, $3, $4, 'Guided through crisis logistics coordination.')
            ON CONFLICT DO NOTHING
        `, [userId, otherUserId, skillIds[0], storyNodeId]);
    }

    // 5. Seed Impact Propagation
    await pool.query(`
      INSERT INTO impact_propagation (root_story_node_id, target_entity_type, propagation_type, description)
      VALUES ($1, 'community', 'stabilizes', 'Enabled community fridge to stay operational during power outage.')
    `, [storyNodeId]);

    // 6. Seed Contextual Trust
    if (userRes.rows.length > 1) {
        const otherUserId = (await pool.query('SELECT id FROM users WHERE id != $1 LIMIT 1', [userId])).rows[0].id;
        await pool.query(`
            INSERT INTO contextual_trust (truster_id, trustee_id, domain_id, score, signals)
            VALUES ($1, $2, $3, 90, '["Story of resilience in North Syracuse"]')
            ON CONFLICT DO NOTHING
        `, [otherUserId, userId, skillIds[0]]);
    }

    console.log('Successfully seeded Phase F6 Narrative Identity data.');
  } catch (err) {
    console.error('Error seeding narrative data:', err);
  } finally {
    process.exit();
  }
};

seedNarrativeData();
