export const primaryMobileNavItems = [
  { label: "Home", path: "/dashboard", match: ["/", "/dashboard"], icon: "home" },
  { label: "Projects", path: "/projects", match: ["/projects", "/project/", "/projectcreation", "/Visualizer"], icon: "projects" },
  { label: "Tasks", path: "/tasks", match: ["/tasks"], icon: "tasks" },
  { label: "Communities", path: "/communities", match: ["/communities", "/communityhub", "/communitycreation"], icon: "communities" },
];

export const platformNavItems = [
  { label: "Dashboard", path: "/dashboard", match: ["/", "/dashboard"], group: "Core" },
  { label: "Projects", path: "/projects", match: ["/projects", "/project/", "/projectcreation", "/Visualizer"], group: "Core" },
  { label: "Tasks", path: "/tasks", match: ["/tasks"], group: "Core" },
  { label: "Needs", path: "/needs", match: ["/needs"], group: "Core" },
  { label: "Communities", path: "/communities", match: ["/communities", "/communityhub", "/communitycreation"], group: "Core" },
  { label: "Guilds", path: "/guilds", match: ["/guilds"], group: "Network" },
  { label: "Constellations", path: "/constellations", match: ["/constellations"], group: "Network" },
  { label: "Resources", path: "/resources-inventory", match: ["/resources-inventory"], group: "Exchange" },
  { label: "Marketplace", path: "/marketplace", match: ["/marketplace"], group: "Exchange" },
  { label: "Activity Map", path: "/activity-map", match: ["/activity-map"], group: "Maps" },
  { label: "Impact Atlas", path: "/impact-atlas", match: ["/impact-atlas"], group: "Maps" },
  { label: "Coordinator HUD", path: "/coordinator-hud", match: ["/coordinator-hud"], group: "Tools" },
  { label: "Dispute Court", path: "/dispute-court", match: ["/dispute-court"], group: "Tools" },
  { label: "Skill Library", path: "/profile/skill-library", match: ["/profile/skill-library"], group: "Profile" },
  { label: "Interest Library", path: "/profile/interest-library", match: ["/profile/interest-library"], group: "Profile" },
  { label: "Skill Constellation", path: "/profile/skill-constellation", match: ["/profile/skill-constellation"], group: "Profile" },
  { label: "Profile", path: "/profile", match: ["/profile"], group: "Account" },
  { label: "Notifications", path: "/notifications", match: ["/notifications"], group: "Account" },
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
