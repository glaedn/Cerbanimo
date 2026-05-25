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
    hudPanels: ['signals', 'pulse', 'regional'],
    widgets: [
      { id: 'daily-focus', label: 'Daily Focus', type: 'focus' },
      { id: 'momentum-summary', label: 'Momentum', type: 'stats' }
    ]
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
    hudPanels: ['mission', 'dispatch', 'river'],
    widgets: [
      { id: 'active-assignments', label: 'My Assignments', type: 'task-list' },
      { id: 'mission-critical', label: 'Mission Critical', type: 'alerts' }
    ]
  },
  commons: {
    label: "Commons",
    icon: "🌱",
    secondaryNav: [
      { label: "Communities", path: "/commons/communities" },
      { label: "Marketplace", path: "/commons/marketplace" },
      { label: "Guilds", path: "/commons/guilds" },
      { label: "Activity", path: "/commons/activity" }
    ],
    hudPanels: ['regional', 'signals', 'river'],
    widgets: [
      { id: 'nearby-needs', label: 'Nearby Needs', type: 'matches' },
      { id: 'guild-signals', label: 'Guild Signals', type: 'signals' }
    ]
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
    hudPanels: ['signals', 'crisis', 'river'],
    widgets: [
      { id: 'urgent-proposals', label: 'Urgent Proposals', type: 'governance' },
      { id: 'impact-pulse', label: 'Impact Pulse', type: 'analytics' }
    ]
  }
};

export function getModeFromPath(pathname) {
  if (pathname.startsWith('/orbit')) return 'orbit';
  if (pathname.startsWith('/missions')) return 'missions';
  if (pathname.startsWith('/commons')) return 'commons';
  if (pathname.startsWith('/signals')) return 'signals';
  return null;
}
