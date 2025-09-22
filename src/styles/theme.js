const theme = {
  colors: {
    backgroundDefault: '#0A0A2E', // deep blue/purple
    backgroundPaper: '#1C1C1E', // dark gray, like ProjectVisualizer's container
    backgroundBlack: '#000000',
    primary: '#00F3FF', // neon cyan/blue, from cyber-modal
    secondary: '#FF5CA2', // neon pink, from ProjectVisualizer tabs/nodes
    accentGreen: '#00D787', // neon green
    accentBlue: '#4DABF7', // bright blue
    accentOrange: '#FF9F40', // orange
    accentPurple: '#9C27B0', // purple
    textPrimary: '#FFFFFF',
    textSecondary: '#CCCCCC',
    border: '#444444',
    error: '#FF4136', // a generic neon red for errors
    success: '#32CD32', // green, for success states
    warning: '#FFA500', // orange, for warnings
    info: '#4DABF7', // blue, for info
  },
  typography: {
    fontFamilyBase: "'Inter', sans-serif",
    fontFamilyAccent: "'Orbitron', sans-serif",
    fontSizeXs: '0.75rem', // 12px
    fontSizeSm: '0.875rem', // 14px
    fontSizeMd: '1rem',     // 16px
    fontSizeLg: '1.25rem',  // 20px
    fontWeightLight: 300,
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 700,
  },
  spacing: { // using a base of 8px
    unit: 8,
    xs: '0.5rem', // 4px
    sm: '1rem',   // 8px
    md: '1.5rem', // 12px
    lg: '2rem',   // 16px
    xl: '3rem',   // 24px
  },
  borders: {
    borderRadiusSm: '4px',
    borderRadiusMd: '8px',
    borderRadiusLg: '12px',
    borderWidth: '1px',
  },
  transitions: {
    short: '0.15s',
    medium: '0.3s',
    easing: 'ease-in-out',
  },
  effects: {
    glowStrong: (color) => `0 0 15px ${color}`,
    glowSubtle: (color) => `0 0 10px ${color}7A`, // 7A for ~0.5 alpha
    glass: { backdropFilter: 'blur(10px)', backgroundColor: 'rgba(28, 28, 30, 0.75)' }, // Example, may need adjustment
  },
  terminology: {
    project: 'Intention',
    project_plural: 'Intentions',
    create_project: 'Set an Intention',
    task: 'Quest',
    task_plural: 'Quests',
    complete_task: 'Complete Quest',
    skill: 'Affinity',
    skill_plural: 'Affinities',
    cotokens: 'Stardust',
    community_tokens: 'Dream Circle Essence',
    project_tokens: 'Crystallized Intention Shards',
    portfolio: 'Grimoire',
    chronicle: 'Grimoire',
    community: 'Dream Circle',
    community_plural: 'Dream Circles',
    peer_review_approval: 'Blessing',
    project_manager_approval: 'Ritual Seal',
    proof_of_work: 'Spell Echo',
    notification: 'Familiar',
    notifications: 'Familiars',
    // Actions and Labels
    submit_task: 'Complete Quest',
    project_approved: 'Intention Received its Ritual Seal',
    proof_of_work_required: 'Spell Echo Required',
    community_dashboard: 'Dream Circle Dashboard',
    view_project: 'View Intention',
    add_project: 'Set an Intention',
  }
};

export default theme;
