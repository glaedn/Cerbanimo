import pool from '../db.js';

export const getLiveActivity = async (req, res) => {
  try {
    const topRealmRes = await pool.query(
      `SELECT r.name, ra.alignment * 100 as alignment
       FROM realms r
       JOIN realm_alignments ra ON r.id = ra.realm_id
       ORDER BY ra.alignment DESC
       LIMIT 1`
    );

    const latestIntentionRes = await pool.query(
      `SELECT name
       FROM intentions
       ORDER BY created_at DESC
       LIMIT 1`
    );

    const activeResonancesRes = await pool.query(
      `SELECT COUNT(*)
       FROM manifestation_sessions
       WHERE status = 'active'`
    );

    const liveData = {
      topRealm: topRealmRes.rows[0] || { name: 'N/A', alignment: 0 },
      latestIntention: latestIntentionRes.rows[0] || { name: 'N/A' },
      activeResonances: parseInt(activeResonancesRes.rows[0].count, 10) || 0,
    };

    res.json(liveData);
  } catch (error) {
    console.error('Error fetching live activity:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};