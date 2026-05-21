export const CORE_MODES = [
  { label: "Orbit", path: "/orbit", match: ["/orbit"], icon: "🪐", group: "Experience" },
  { label: "Missions", path: "/missions", match: ["/missions"], icon: "🚀", group: "Experience" },
  { label: "Commons", path: "/commons", match: ["/commons"], icon: "🌱", group: "Experience" },
  { label: "Signals", path: "/signals", match: ["/signals"], icon: "📡", group: "Experience" },
];

export const primaryMobileNavItems = [
  { label: "Orbit", path: "/orbit", match: ["/orbit"], icon: "orbit" },
  { label: "Missions", path: "/missions", match: ["/missions"], icon: "missions" },
  { label: "Commons", path: "/commons", match: ["/commons"], icon: "commons" },
  { label: "Signals", path: "/signals", match: ["/signals"], icon: "signals" },
];

export const platformNavItems = [
  { label: "Dashboard", path: "/orbit", match: ["/", "/orbit", "/dashboard"], group: "Core" },
  { label: "Projects", path: "/missions/projects", match: ["/missions/projects", "/missions/project/", "/missions/projectcreation", "/missions/visualizer"], group: "Core" },
  { label: "Tasks", path: "/missions/tasks", match: ["/missions/tasks"], group: "Core" },
  { label: "Needs", path: "/commons/needs", match: ["/commons/needs"], group: "Core" },
  { label: "Communities", path: "/commons/communities", match: ["/commons/communities", "/commons/community/", "/commons/communitycreation"], group: "Core" },
  { label: "Guilds", path: "/commons/guilds", match: ["/commons/guilds", "/commons/guild/"], group: "Network" },
  { label: "Constellations", path: "/commons/constellations", match: ["/commons/constellations"], group: "Network" },
  { label: "Resources", path: "/commons/resources", match: ["/commons/resources", "/resources-inventory"], group: "Exchange" },
  { label: "Marketplace", path: "/commons/marketplace", match: ["/commons/marketplace"], group: "Exchange" },
  { label: "Activity Map", path: "/signals/activity-map", match: ["/signals/activity-map"], group: "Maps" },
  { label: "Impact Atlas", path: "/signals/impact", match: ["/signals/impact", "/impact-atlas"], group: "Maps" },
  { label: "Coordinator HUD", path: "/orbit/coordinator-hud", match: ["/orbit/coordinator-hud"], group: "Tools" },
  { label: "Dispute Court", path: "/signals/dispute-court", match: ["/signals/dispute-court"], group: "Tools" },
  { label: "Skill Library", path: "/orbit/skill-library", match: ["/orbit/skill-library", "/profile/skill-library"], group: "Profile" },
  { label: "Interest Library", path: "/orbit/interest-library", match: ["/orbit/interest-library", "/profile/interest-library"], group: "Profile" },
  { label: "Skill Constellation", path: "/orbit/skills", match: ["/orbit/skills", "/profile/skill-constellation"], group: "Profile" },
  { label: "Profile", path: "/orbit/profile", match: ["/orbit/profile", "/profile"], group: "Account" },
  { label: "Notifications", path: "/orbit/notifications", match: ["/orbit/notifications", "/notifications"], group: "Account" },
];

export function isRouteActive(pathname, item) {
  return item.match.some((pattern) => {
    if (pattern === "/") return pathname === "/";
    return pathname === pattern || pathname.startsWith(pattern);
  });
}

export function groupedNavItems(items = platformNavItems) {
  return items.reduce((groups, item) => {
    const group = item.group || "Platform";
    if (!groups[group]) groups[group] = [];
    groups[group].push(item);
    return groups;
  }, {});
}
