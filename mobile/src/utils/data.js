export function normalizeArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }
  return [value];
}

export function readName(value) {
  if (!value) return "";
  if (typeof value === "string") {
    try {
      return JSON.parse(value).name || value;
    } catch {
      return value;
    }
  }
  return value.name || value.title || String(value.id || "");
}

export function skillNames(profile) {
  return normalizeArray(profile?.skills).map(readName).filter(Boolean);
}

export function compactDate(value) {
  if (!value) return "No date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function taskStatusTone(status = "") {
  const lower = status.toLowerCase();
  if (lower.includes("completed") || lower.includes("approved")) return "green";
  if (lower.includes("urgent") || lower.includes("rejected")) return "rose";
  if (lower.includes("active") || lower.includes("submitted")) return "cyan";
  return "amber";
}

export function xpFromSkills(allSkills = [], profileId) {
  if (!profileId) return 0;
  return allSkills.reduce((total, skill) => {
    const unlocked = normalizeArray(skill.unlocked_users);
    const entry = unlocked.find((user) => Number(user?.user_id) === Number(profileId));
    return total + Number(entry?.experience ?? entry?.exp ?? 0);
  }, 0);
}

export function levelFromXp(xp) {
  const level = Math.floor(Math.sqrt(Math.max(xp, 0) / 40)) + 1;
  const currentFloor = 40 * Math.pow(level - 1, 2);
  const nextFloor = 40 * Math.pow(level, 2);
  const progress = nextFloor > currentFloor ? (xp - currentFloor) / (nextFloor - currentFloor) : 0;
  return {
    level,
    progress: Math.min(Math.max(progress, 0), 1),
    current: Math.max(xp - currentFloor, 0),
    required: nextFloor - currentFloor
  };
}
