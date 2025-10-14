import pool from '../db.js';

export const scheduleManifestation = async (req, res) => {
  const { title, description, start_time, realm_id } = req.body;

  try {
    const newManifestation = await pool.query(
      'INSERT INTO manifestation_sessions (intention_id, realm_id, title, description, start_time) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [1, realm_id, title, description, start_time] // Assuming a placeholder intention_id of 1
    );
    res.status(201).json(newManifestation.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to schedule manifestation' });
  }
};

export const getManifestationsForRealm = async (req, res) => {
  const { realmId } = req.params;

  try {
    const manifestations = await pool.query(
      'SELECT * FROM manifestation_sessions WHERE realm_id = $1 ORDER BY start_time DESC',
      [realmId]
    );
    res.status(200).json(manifestations.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to retrieve manifestations' });
  }
};