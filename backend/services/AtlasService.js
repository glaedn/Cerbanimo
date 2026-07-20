import pool from '../db.js';

const ACTIVE_PROJECTS_SQL = `
  SELECT
    p.id,
    p.name,
    p.description,
    p.status,
    p.visibility,
    p.community_id,
    c.name AS community_name,
    COUNT(DISTINCT t.id)::integer AS task_count,
    COUNT(DISTINCT t.id) FILTER (WHERE t.status::text ILIKE 'completed%')::integer AS completed_task_count
  FROM projects p
  LEFT JOIN communities c ON c.id = p.community_id
  LEFT JOIN tasks t ON t.project_id = p.id
  WHERE COALESCE(p.status, 'active') NOT IN ('closed', 'archived')
    AND (
      p.creator_id = $1
      OR EXISTS (
        SELECT 1
        FROM tasks assigned_task
        WHERE assigned_task.project_id = p.id
          AND $1 = ANY(COALESCE(assigned_task.assigned_user_ids, ARRAY[]::integer[]))
      )
    )
  GROUP BY p.id, c.name
  ORDER BY p.id DESC
`;

const MEMBER_COMMUNITIES_SQL = `
  SELECT
    c.id,
    c.name,
    c.description,
    c.city,
    c.state,
    c.country,
    c.formatted_address,
    cardinality(COALESCE(c.members, ARRAY[]::integer[]))::integer AS member_count
  FROM communities c
  WHERE $1 = ANY(COALESCE(c.members, ARRAY[]::integer[]))
  ORDER BY c.name
`;

const ADJACENT_COMMUNITIES_SQL = `
  SELECT
    c.id,
    c.name,
    c.description,
    c.city,
    c.state,
    c.country,
    c.formatted_address,
    cardinality(COALESCE(c.members, ARRAY[]::integer[]))::integer AS member_count,
    CASE
      WHEN actor.location_point IS NOT NULL AND c.location_point IS NOT NULL
        THEN ROUND((ST_Distance(actor.location_point, c.location_point) / 1000.0)::numeric, 1)::double precision
      ELSE NULL
    END AS distance_km,
    CASE
      WHEN actor.location_point IS NOT NULL AND c.location_point IS NOT NULL THEN 'nearby'
      WHEN NULLIF(actor.state, '') IS NOT NULL AND LOWER(actor.state) = LOWER(c.state) THEN 'same_state'
      WHEN NULLIF(actor.country, '') IS NOT NULL AND LOWER(actor.country) = LOWER(c.country) THEN 'same_country'
      ELSE 'federation'
    END AS adjacency_reason
  FROM communities c
  JOIN users actor ON actor.id = $1
  WHERE NOT ($1 = ANY(COALESCE(c.members, ARRAY[]::integer[])))
    AND (
      (
        actor.location_point IS NOT NULL
        AND c.location_point IS NOT NULL
        AND ST_DWithin(actor.location_point, c.location_point, 160934)
      )
      OR (
        NULLIF(actor.state, '') IS NOT NULL
        AND NULLIF(c.state, '') IS NOT NULL
        AND LOWER(actor.state) = LOWER(c.state)
      )
      OR (
        NULLIF(actor.country, '') IS NOT NULL
        AND NULLIF(c.country, '') IS NOT NULL
        AND LOWER(actor.country) = LOWER(c.country)
      )
    )
  ORDER BY distance_km ASC NULLS LAST, c.name
  LIMIT 12
`;

const BASIC_ADJACENT_COMMUNITIES_SQL = `
  SELECT
    c.id,
    c.name,
    c.description,
    c.city,
    c.state,
    c.country,
    c.formatted_address,
    cardinality(COALESCE(c.members, ARRAY[]::integer[]))::integer AS member_count,
    NULL::double precision AS distance_km,
    CASE
      WHEN NULLIF(actor.state, '') IS NOT NULL AND LOWER(actor.state) = LOWER(c.state) THEN 'same_state'
      WHEN NULLIF(actor.country, '') IS NOT NULL AND LOWER(actor.country) = LOWER(c.country) THEN 'same_country'
      ELSE 'federation'
    END AS adjacency_reason
  FROM communities c
  JOIN users actor ON actor.id = $1
  WHERE NOT ($1 = ANY(COALESCE(c.members, ARRAY[]::integer[])))
    AND (
      (
        NULLIF(actor.state, '') IS NOT NULL
        AND NULLIF(c.state, '') IS NOT NULL
        AND LOWER(actor.state) = LOWER(c.state)
      )
      OR (
        NULLIF(actor.country, '') IS NOT NULL
        AND NULLIF(c.country, '') IS NOT NULL
        AND LOWER(actor.country) = LOWER(c.country)
      )
    )
  ORDER BY c.name
  LIMIT 12
`;

const adjacencyStrategyByDatabase = new WeakMap();

async function getAdjacentCommunities(database, userId) {
  if (adjacencyStrategyByDatabase.get(database) === 'basic') {
    return database.query(BASIC_ADJACENT_COMMUNITIES_SQL, [userId]);
  }

  try {
    const result = await database.query(ADJACENT_COMMUNITIES_SQL, [userId]);
    adjacencyStrategyByDatabase.set(database, 'spatial');
    return result;
  } catch (error) {
    const spatialSchemaUnavailable = error?.code === '42703' || error?.code === '42883';
    if (!spatialSchemaUnavailable) throw error;

    adjacencyStrategyByDatabase.set(database, 'basic');
    return database.query(BASIC_ADJACENT_COMMUNITIES_SQL, [userId]);
  }
}

function numberOrZero(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function serializeProject(project) {
  return {
    id: project.id,
    name: project.name,
    description: project.description || '',
    status: project.status || 'active',
    visibility: project.visibility || 'private',
    communityId: project.community_id ?? null,
    communityName: project.community_name || null,
    taskCount: numberOrZero(project.task_count),
    completedTaskCount: numberOrZero(project.completed_task_count)
  };
}

function serializeCommunity(community, relationship) {
  return {
    id: community.id,
    name: community.name,
    description: community.description || '',
    relationship,
    location: {
      city: community.city || null,
      state: community.state || null,
      country: community.country || null,
      formattedAddress: community.formatted_address || null
    },
    memberCount: numberOrZero(community.member_count),
    distanceKm: community.distance_km == null ? null : numberOrZero(community.distance_km),
    adjacencyReason: relationship === 'member' ? 'membership' : community.adjacency_reason || 'federation'
  };
}

export async function getAtlasForUser(userId, database = pool) {
  if (!userId) throw new Error('A resolved Cerbanimo user is required to build the atlas.');

  const [actorResult, projectsResult, activeCommunitiesResult, adjacentCommunitiesResult] = await Promise.all([
    database.query(
      `SELECT id, username, profile_picture, city, state, country, formatted_address
       FROM users
       WHERE id = $1`,
      [userId]
    ),
    database.query(ACTIVE_PROJECTS_SQL, [userId]),
    database.query(MEMBER_COMMUNITIES_SQL, [userId]),
    getAdjacentCommunities(database, userId)
  ]);

  const actor = actorResult.rows[0];
  if (!actor) return null;

  return {
    actor: {
      id: actor.id,
      username: actor.username,
      profilePicture: actor.profile_picture || null,
      location: {
        city: actor.city || null,
        state: actor.state || null,
        country: actor.country || null,
        formattedAddress: actor.formatted_address || null
      }
    },
    projects: projectsResult.rows.map(serializeProject),
    communities: {
      active: activeCommunitiesResult.rows.map(row => serializeCommunity(row, 'member')),
      adjacent: adjacentCommunitiesResult.rows.map(row => serializeCommunity(row, 'adjacent'))
    }
  };
}
