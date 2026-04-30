import pool from '../backend/db.js';

const createUserChroniclesTable = async () => {
  const dropTableQuery = `DROP TABLE IF EXISTS user_chronicles CASCADE;`;

  const createViewQuery = `
    CREATE OR REPLACE VIEW user_chronicles AS
    SELECT
        sn.user_id,
        sn.id                        AS id,
        sn.id                        AS story_node_id,
        sn.reflection,
        sn.tags,
        sn.created_at,
        p.id                         AS project_id,
        NULL::INTEGER                AS community_id,
        t.name                       AS title,
        'text'::VARCHAR(50)          AS content_type,
        'published'::VARCHAR(50)     AS status,
        0                            AS upvotes,
        sn.created_at                AS updated_at,
        t.id                         AS task_id,
        t.name                       AS task_name,
        t.reward_tokens,
        p.name                       AS project_name,
        sk.id                        AS skill_id,
        sk.name                      AS skill_name,
        sn.media_urls,
        COALESCE((
            SELECT json_agg(
                json_build_object(
                    'emoji', e.emoji,
                    'badge', e.badge,
                    'comment', e.comment
                )
            )
            FROM endorsements e
            WHERE e.story_node_id = sn.id
        ), '[]'::json)               AS endorsements
    FROM story_nodes sn
    JOIN tasks t        ON sn.task_id    = t.id
    JOIN projects p     ON t.project_id  = p.id
    LEFT JOIN skills sk ON sk.name::text = ANY(sn.tags)
    GROUP BY
        sn.user_id, sn.id, sn.reflection, sn.tags,
        sn.created_at, sn.media_urls,
        t.id, t.name, t.reward_tokens,
        p.id, p.name,
        sk.id, sk.name;
  `;

  try {
    // We check if it's a table before dropping, to avoid unnecessary drops if it's already a view
    const checkQuery = `
      SELECT table_type
      FROM information_schema.tables
      WHERE table_name = 'user_chronicles';
    `;
    const res = await pool.query(checkQuery);
    if (res.rows.length > 0 && res.rows[0].table_type === 'BASE TABLE') {
      await pool.query(dropTableQuery);
      console.log('PostgreSQL: Existing user_chronicles table dropped to make way for view.');
    }

    await pool.query(createViewQuery);
    console.log('PostgreSQL: user_chronicles view created or updated.');
  } catch (err) {
    console.error('PostgreSQL: Error creating user_chronicles view:', err);
  }
};

export {
  createUserChroniclesTable,
};
