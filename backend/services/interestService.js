import pool from '../db.js';

/**
 * Processes a list of interests for a user.
 * Skips blacklisted interests.
 * Existing interests are used as is.
 * New interests are created with 'pending' status.
 * Returns an array of interest objects { id, name }.
 */
export const processInterests = async (interests, userId, client = pool) => {
  const processedInterests = [];
  if (!interests || !Array.isArray(interests)) return processedInterests;

  for (const interest of interests) {
    const interestName = typeof interest === 'string' ? interest : interest.name;
    if (!interestName) continue;

    // Check if interest exists
    const existingInterestResult = await client.query(
      'SELECT id, status FROM interests WHERE name = $1',
      [interestName]
    );

    let interestId;
    if (existingInterestResult.rows.length > 0) {
      const existing = existingInterestResult.rows[0];
      if (existing.status === 'blacklisted') {
        console.log(`Skipping blacklisted interest: ${interestName}`);
        continue;
      }
      interestId = existing.id;
    } else {
      // Insert new interest as pending
      const newInterestResult = await client.query(
        'INSERT INTO interests (name, status, creator_id) VALUES ($1, $2, $3) RETURNING id',
        [interestName, 'pending', userId]
      );
      interestId = newInterestResult.rows[0].id;
    }
    processedInterests.push({ id: interestId, name: interestName });
  }

  return processedInterests;
};

/**
 * Filters a list of interest objects, removing those that are pending
 * and were not created by the specified user.
 */
export const filterVisibleInterests = async (interests, viewerUserId) => {
  if (!interests || !Array.isArray(interests)) return [];

  const interestNames = interests.map(i => typeof i === 'string' ? JSON.parse(i).name : i.name);
  if (interestNames.length === 0) return [];

  const result = await pool.query(
    `SELECT name, status, creator_id FROM interests WHERE name = ANY($1)`,
    [interestNames]
  );

  const statusMap = {};
  result.rows.forEach(row => {
    statusMap[row.name] = { status: row.status, creator_id: row.creator_id };
  });

  return interests.filter(interest => {
    const name = typeof interest === 'string' ? JSON.parse(interest).name : interest.name;
    const info = statusMap[name];
    if (!info) return true; // If not in table, assume public (legacy)
    if (info.status === 'active') return true;
    if (info.status === 'pending' && info.creator_id === viewerUserId) return true;
    return false;
  });
};
