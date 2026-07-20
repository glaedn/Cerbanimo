import pool from '../db.js';

function parseJsonValue(value) {
  if (value && typeof value === 'object') return value;
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const parsed = JSON.parse(trimmed);
    return parsed && typeof parsed === 'object' ? parsed : { id: parsed };
  } catch {
    return /^\d+$/.test(trimmed) ? { id: Number(trimmed) } : null;
  }
}

function nonNegativeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

export function normalizeActorSkillRefs(rawSkills) {
  if (!Array.isArray(rawSkills)) return [];

  const refs = new Map();
  for (const rawSkill of rawSkills) {
    const parsed = typeof rawSkill === 'number' ? { id: rawSkill } : parseJsonValue(rawSkill);
    const id = Number(parsed?.id ?? parsed?.skill_id ?? parsed?.skillId);
    if (!Number.isInteger(id) || id <= 0 || refs.has(id)) continue;
    refs.set(id, {
      id,
      name: typeof parsed?.name === 'string' ? parsed.name.trim() : ''
    });
  }

  return [...refs.values()];
}

function matchingProgress(unlockedUsers, actorUserId) {
  if (!Array.isArray(unlockedUsers)) return null;
  return unlockedUsers
    .map(parseJsonValue)
    .find(entry => String(entry?.user_id ?? entry?.userId ?? '') === String(actorUserId)) || null;
}

export async function getActorProgression(actorUserId, rawSkills, db = pool) {
  const refs = normalizeActorSkillRefs(rawSkills);
  if (!refs.length) return [];

  const result = await db.query(
    `SELECT id, name, unlocked_users
     FROM skills
     WHERE id = ANY($1::int[])`,
    [refs.map(skill => skill.id)]
  );
  const rowsById = new Map(result.rows.map(row => [Number(row.id), row]));

  return refs
    .map(ref => {
      const row = rowsById.get(ref.id);
      const progress = matchingProgress(row?.unlocked_users, actorUserId);
      return {
        id: ref.id,
        name: row?.name || ref.name || `Skill ${ref.id}`,
        level: nonNegativeNumber(progress?.level),
        xp: nonNegativeNumber(progress?.exp ?? progress?.experience ?? progress?.xp)
      };
    })
    .sort((left, right) => right.xp - left.xp || right.level - left.level || left.name.localeCompare(right.name));
}

export default { getActorProgression, normalizeActorSkillRefs };
