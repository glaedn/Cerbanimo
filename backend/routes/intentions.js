import express from 'express';
import pg from 'pg';
import { autoGeneratePetals } from '../services/petalGenerator.js';

const { Pool } = pg;

const router = express.Router();
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
});

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM intentions');
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching intentions:', err);
    res.status(500).json({ message: 'Failed to fetch intentions' });
  }
});

// Fetch all intentions with optional search, pagination, and prioritizing user-created intentions
router.get('/personal', async (req, res) => {
    const { search = '', page = 1, auth0Id = '' } = req.query;

    try {
      // Get the internal user ID from the Auth0 ID
      const userQuery = `
        SELECT id FROM users WHERE auth0_id = $1
      `;
      const userResult = await pool.query(userQuery, [auth0Id]);
      const userId = userResult.rows[0]?.id || null;

      if (!userId) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Fetch intentions, prioritizing those created by the user
      const intentionsQuery = `
        SELECT * FROM intentions
        WHERE
          LOWER(name) LIKE LOWER($1) OR
          LOWER(description) LIKE LOWER($1)
        ORDER BY
          (CASE WHEN creator_id = $2 THEN 0 ELSE 1 END),
          id ASC
        LIMIT 10 OFFSET $3
      `;
      const offset = (page - 1) * 10;
      const searchParam = `%${search}%`;
      const intentionsResult = await pool.query(intentionsQuery, [searchParam, userId, offset]);

      res.status(200).json(intentionsResult.rows);
    } catch (err) {
      console.error('Error fetching intentions:', err);
      res.status(500).json({ message: 'Failed to fetch intentions' });
    }
  });

// Fetch "near" intentions (from user's realms, excluding their own)
router.get('/near', async (req, res) => {
  const { auth0Id } = req.query;

  if (!auth0Id) {
    return res.status(400).json({ message: 'Auth0 ID is required' });
  }

  try {
    // Get internal user ID from Auth0 ID
    const userResult = await pool.query('SELECT id FROM users WHERE auth0_id = $1', [auth0Id]);
    const userId = userResult.rows[0]?.id;

    if (!userId) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Fetch intentions from realms the user is a member of, excluding their own intentions, and include resonance score
    const query = `
      SELECT i.*, COUNT(r.id) as resonance_score
      FROM intentions i
      LEFT JOIN resonances r ON i.id = r.intention_id
      WHERE i.realm_id IN (SELECT realm_id FROM realm_members WHERE user_id = $1)
      AND i.creator_id != $1
      GROUP BY i.id
      ORDER BY resonance_score DESC
      LIMIT 10;
    `;

    const result = await pool.query(query, [userId]);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching near intentions:', err);
    res.status(500).json({ message: 'Failed to fetch near intentions' });
  }
});

// Fetch only user-created intentions
router.get('/userintentions', async (req, res) => {
  try {
    const { userId = '', page = 1, pageSize = 10 } = req.query;
    const offset = (page - 1) * pageSize;

    const query = `
      SELECT * FROM intentions
      WHERE creator_id = $1
      ORDER BY id ASC
      LIMIT $2 OFFSET $3
    `;
    const values = [userId, pageSize, offset];

    const result = await pool.query(query, values);

    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching user intentions:', err);
    res.status(500).json({ message: 'Failed to fetch user intentions' });
  }
});

// Fetch a intention by ID
router.get('/:intentionId', async (req, res) => {
  const { intentionId } = req.params;
  try {
    const query = 'SELECT * FROM intentions WHERE id = $1';
    const result = await pool.query(query, [intentionId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Intention not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching intention:', error);
    res.status(500).json({ message: 'Failed to fetch intention' });
  }
});

// Update intention tags
router.patch('/:intentionId', async (req, res) => {
  const { intentionId } = req.params;
  const { tags } = req.body;

  try {
    const query = 'UPDATE intentions SET tags = $1 WHERE id = $2 RETURNING *';
    const result = await pool.query(query, [tags, intentionId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Intention not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating intention tags:', error);
    res.status(500).json({ message: 'Failed to update intention tags' });
  }
});

// Create a new intention
router.post('/create', async (req, res) => {
  try {
    const { name, description, auth0_id } = req.body;
    const tags = req.body.tags.map(tag => tag.name);

    if (!name || !description || !auth0_id) {
      return res.status(400).json({ message: 'Name, description, and Auth0 ID are required' });
    }

    // Step 1: Fetch the internal user ID from the Auth0 ID
    const userQuery = `
      SELECT id FROM users WHERE auth0_id = $1
    `;
    const userResult = await pool.query(userQuery, [auth0_id]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const creator_id = userResult.rows[0].id;

    // Step 2: Insert the new intention with the derived creator_id
    const insertQuery = `
      INSERT INTO intentions (name, description, tags, creator_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;

    const result = await pool.query(insertQuery, [name, description, tags, creator_id]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating intention:', err);
    res.status(500).json({ message: 'Failed to create intention' });
  }
});

// Update an existing intention
router.put('/:intentionId', async (req, res) => {
  const { intentionId } = req.params;
  const { name, description, tags } = req.body;

  if (!name || !description) {
      return res.status(400).json({ error: 'Name and description are required' });
  }

  try {
      await pool.query(
          `UPDATE intentions
          SET name = $1, description = $2, tags = $3
          WHERE id = $4`,
          [name, description, tags, intentionId]
      );
      res.status(200).json({ message: 'Intention updated successfully' });
  } catch (error) {
      console.error('Failed to update intention:', error);
      res.status(500).json({ error: 'Failed to update intention' });
  }
});

//import and export functions
// Export intention + petals as JSON
router.get('/:intentionId/export', async (req, res) => {
  const { intentionId } = req.params;
  try {
    // Fetch intention
    const intentionQuery = 'SELECT * FROM intentions WHERE id = $1';
    const intentionResult = await pool.query(intentionQuery, [intentionId]);

    if (intentionResult.rows.length === 0) {
      return res.status(404).json({ message: 'Intention not found' });
    }

    const intention = intentionResult.rows[0];

    // Fetch petals
    const petalsQuery = 'SELECT * FROM petals WHERE intention_id = $1';
    const petalsResult = await pool.query(petalsQuery, [intentionId]);

    const exportData = {
      intention: {
        name: intention.name,
        description: intention.description,
        tags: intention.tags,
        token_pool: intention.token_pool,
        used_tokens: intention.used_tokens,
        reserved_tokens: intention.reserved_tokens
      },
      petals: petalsResult.rows.map(petal => ({
        name: petal.name,
        description: petal.description,
        reward_tokens: petal.reward_tokens,
        status: petal.status,
        dependencies: petal.dependencies,
        skill_id: petal.skill_id
      }))
    };

    res.status(200).json(exportData);
  } catch (error) {
    console.error('Error exporting intention:', error);
    res.status(500).json({ message: 'Failed to export intention' });
  }
});


// Import intention + petals from JSON
router.post('/import', async (req, res) => {
  const { intention, petals, auth0_id } = req.body; // JSON must include auth0_id to assign creator

  if (!intention || !petals || !auth0_id) {
    return res.status(400).json({ message: 'Intention, petals, and auth0_id are required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get internal user ID
    const userQuery = 'SELECT id FROM users WHERE auth0_id = $1';
    const userResult = await client.query(userQuery, [auth0_id]);
    const creator_id = userResult.rows[0]?.id;

    if (!creator_id) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'User not found' });
    }

    // Insert new intention
    const intentionInsertQuery = `
      INSERT INTO intentions (name, description, tags, creator_id, token_pool, used_tokens, reserved_tokens)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id;
    `;
    const intentionResult = await client.query(intentionInsertQuery, [
      intention.name, intention.description, intention.tags, creator_id,
      intention.token_pool, intention.used_tokens, intention.reserved_tokens
    ]);
    const newIntentionId = intentionResult.rows[0].id;

    // Map template petal "index" to new database petal IDs
    const petalIdMap = {}; // { templateIndex: newId }

    // First pass — create all petals (without dependencies yet)
    for (let i = 0; i < petals.length; i++) {
      const petal = petals[i];
      const insertPetalQuery = `
        INSERT INTO petals (name, description, intention_id, creator_id, reward_tokens, status, skill_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id;
      `;
      const petalResult = await client.query(insertPetalQuery, [
        petal.name, petal.description, newIntentionId, creator_id,
        petal.reward_tokens, petal.status, petal.skill_id
      ]);
      petalIdMap[i] = petalResult.rows[0].id;
    }

    // Second pass — update dependencies with new IDs
    for (let i = 0; i < petals.length; i++) {
      const petal = petals[i];
      const newPetalId = petalIdMap[i];

      if (petal.dependencies && petal.dependencies.length > 0) {
        const remappedDependencies = petal.dependencies.map(depIndex => petalIdMap[depIndex]);

        const updateDepsQuery = `
          UPDATE petals SET dependencies = $1 WHERE id = $2
        `;
        await client.query(updateDepsQuery, [remappedDependencies, newPetalId]);
      }
    }

    await client.query('COMMIT');
    res.status(201).json({ message: 'Intention imported successfully', intentionId: newIntentionId });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error importing intention:', error);
    res.status(500).json({ message: 'Failed to import intention' });
  } finally {
    client.release();
  }
});

router.post('/auto-generate', async (req, res) => {
  const { intentionId } = req.body;

  if (!intentionId) {
    return res.status(400).json({ success: false, error: 'Missing intentionId' });
  }

  try {
    // 1. Fetch intention details
    const intentionResult = await pool.query('SELECT name, description FROM intentions WHERE id = $1', [intentionId]);
    const intention = intentionResult.rows[0];

    if (!intention) {
      return res.status(404).json({ success: false, error: 'Intention not found' });
    }

    // 2. Generate petals using LLM
    const generatedData = await autoGeneratePetals(intention.name, intention.description);
    console.log('Generated data:', generatedData);
    const petals = generatedData.petals
    console.log('Generated petals:', petals);

    // 3. First pass: Insert petals WITHOUT dependencies, and build LLM ID → DB ID map
    const llmToDbIdMap = {};

    for (const petal of petals) {
      const result = await pool.query(
        'INSERT INTO petals (intention_id, name, description, skill_id, status, dependencies, reward_tokens) VALUES ($1, $2, $3, $4, $5, $6::int[], $7) RETURNING id',
        [intentionId, petal.name, petal.description, petal.skill_id, 'Seeded', [], petal.reward_tokens]
      );
      const dbId = result.rows[0].id;
      llmToDbIdMap[petal.id] = dbId;
    }

    // 4. Second pass: Update dependencies with resolved DB IDs
    const updatePromises = petals.map(petal => {
      const resolvedDeps = (Array.isArray(petal.dependencies) ? petal.dependencies : []).map(depId => llmToDbIdMap[depId]);
      return pool.query(
        'UPDATE petals SET dependencies = $1::int[] WHERE id = $2',
        [resolvedDeps, llmToDbIdMap[petal.id]]
      );
    });

    await Promise.all(updatePromises);

    // 5. Respond with success and DB petal IDs
    const insertedPetals = petals.map(petal => ({
      ...petal,
      db_id: llmToDbIdMap[petal.id], // Optional: return DB IDs alongside LLM petal data
      resolvedDependencies: (Array.isArray(petal.dependencies) ? petal.dependencies : []).map(depId => llmToDbIdMap[depId])
    }));

    res.json({ success: true, petals: insertedPetals });
  } catch (error) {
    console.error('Auto-generate petals failed:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Resonate with an intention
router.post('/:intentionId/resonate', async (req, res) => {
  const { intentionId } = req.params;
  const { userId } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const resonanceQuery = 'INSERT INTO resonances (user_id, intention_id) VALUES ($1, $2) ON CONFLICT (user_id, intention_id) DO NOTHING RETURNING *';
    const resonanceResult = await client.query(resonanceQuery, [userId, intentionId]);

    if (resonanceResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(200).json({ message: 'User has already resonated with this intention.' });
    }

    // Get the ID of the "General Contribution" capability
    const capabilityQuery = "SELECT id FROM capabilities WHERE name = 'General Contribution'";
    const capabilityResult = await client.query(capabilityQuery);
    const capabilityId = capabilityResult.rows[0].id;

    // Award 10 XP for resonating
    const experienceQuery = `
      UPDATE capabilities
      SET unlocked_users = jsonb_set(
        unlocked_users,
        (
          SELECT CONCAT('{', index-1, ',exp}')::text[]
          FROM jsonb_array_elements(unlocked_users) WITH ORDINALITY arr(elem, index)
          WHERE (elem->>'user_id')::int = $1
        ),
        to_jsonb((
          SELECT (elem->>'exp')::int + 10
          FROM jsonb_array_elements(unlocked_users) AS elem
          WHERE (elem->>'user_id')::int = $1
        ))
      )
      WHERE id = $2 AND EXISTS (
        SELECT 1
        FROM jsonb_array_elements(unlocked_users) AS elem
        WHERE (elem->>'user_id')::int = $1
      );
    `;
    const updateResult = await client.query(experienceQuery, [userId, capabilityId]);

    if (updateResult.rowCount === 0) {
      // If the user is not in the array, add them
      const addUserQuery = `
        UPDATE capabilities
        SET unlocked_users = unlocked_users || '[{"user_id": $1, "exp": 10, "level": 1, "unlocked_at": "now()"}]'::jsonb
        WHERE id = $2;
      `;
      await client.query(addUserQuery, [userId, capabilityId]);
    }

    await client.query('COMMIT');
    res.status(201).json(resonanceResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating resonance:', error);
    res.status(500).json({ message: 'Failed to create resonance' });
  } finally {
    client.release();
  }
});

// Get resonance data for an intention
router.get('/:intentionId/resonances', async (req, res) => {
  const { intentionId } = req.params;
  const { userId } = req.query;
  try {
    const countQuery = 'SELECT COUNT(*) FROM resonances WHERE intention_id = $1';
    const countResult = await pool.query(countQuery, [intentionId]);
    const count = parseInt(countResult.rows[0].count, 10);

    let userHasResonated = false;
    if (userId) {
      const userQuery = 'SELECT * FROM resonances WHERE user_id = $1 AND intention_id = $2';
      const userResult = await pool.query(userQuery, [userId, intentionId]);
      userHasResonated = userResult.rows.length > 0;
    }

    res.status(200).json({ count, userHasResonated });
  } catch (error) {
    console.error('Error fetching resonance data:', error);
    res.status(500).json({ message: 'Failed to fetch resonance data' });
  }
});


export default router;