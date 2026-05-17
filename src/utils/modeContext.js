export const MODE_CONFIGS = {
  orbit: {
    label: "My Orbit",
    icon: "🪐",
    secondaryNav: [
      { label: "Focus", path: "/orbit" },
      { label: "Chronicle", path: "/orbit/chronicle" },
      { label: "Skills", path: "/orbit/skills" },
      { label: "Activity", path: "/orbit/activity" }
    ],
    hudPanels: ['signals', 'pulse', 'regional']
  },
  missions: {
    label: "Mission Control",
    icon: "🚀",
    secondaryNav: [
      { label: "Active", path: "/missions" },
      { label: "Projects", path: "/missions/projects" },
      { label: "Tasks", path: "/missions/tasks" },
      { label: "Review", path: "/missions/review" }
    ],
    hudPanels: ['mission', 'dispatch', 'river']
  },
  commons: {
    label: "Commons",
    icon: "🌱",
    secondaryNav: [
      { label: "Communities", path: "/commons" },
      { label: "Marketplace", path: "/commons/marketplace" },
      { label: "Guilds", path: "/commons/guilds" },
      { label: "Activity", path: "/commons/activity" }
    ],
    hudPanels: ['regional', 'signals', 'river']
  },
  signals: {
    label: "Signals",
    icon: "📡",
    secondaryNav: [
      { label: "Governance", path: "/signals" },
      { label: "Impact", path: "/signals/impact" },
      { label: "Crisis", path: "/signals/crisis" },
      { label: "Federation", path: "/signals/federation" }
    ],
    hudPanels: ['signals', 'crisis', 'river']
  }
};

export function getModeFromPath(pathname) {
  if (pathname.startsWith('/orbit')) return 'orbit';
  if (pathname.startsWith('/missions')) return 'missions';
  if (pathname.startsWith('/commons')) return 'commons';
  if (pathname.startsWith('/signals')) return 'signals';
  return null;
}
