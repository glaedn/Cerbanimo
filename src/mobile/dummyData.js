// src/mobile/dummyData.js

export const dummyData = {
  title: "Global Makers Society",
  lotusBlossom: [
    { id: 'realm-1', title: 'Cosmic Gardeners', type: 'Realm', glowColor: '#E6E6FA' },
    { id: 'manifest-1', title: 'AI-Art Synthesis', type: 'Manifestation', glowColor: '#ADD8E6' },
    { id: 'realm-2', title: 'Community Weavers', type: 'Realm', glowColor: '#E6E6FA' },
    { id: 'manifest-2', title: 'Holistic Health', type: 'Manifestation', glowColor: '#ADD8E6' },
    { id: 'manifest-3', title: 'Mycelial Network', type: 'Manifestation', glowColor: '#ADD8E6' },
  ],
  doubleHelix: [
    { id: 'stake-1', title: 'Staked: Permaculture AI', glowColor: '#FFD700' },
    { id: 'stake-2', title: 'Staked: Urban Farm Pods', glowColor: '#00FFFF' },
    { id: 'stake-3', title: 'Staked: Bio-Harmonizer', glowColor: '#FF69B4' },
    { id: 'stake-4', title: 'Staked: Water Filtration', glowColor: '#00FFFF' },
    { id: 'stake-5', title: 'Staked: Creative Hub DAO', glowColor: '#FFD700' },
    { id: 'stake-6', title: 'Staked: Myco-Filtration', glowColor: '#FF69B4' },
  ],
  rootTasks: {
    nodes: [
      { id: 'root', x: 200, y: 0, glowColor: 'transparent' }, // Hidden root
      { id: 1, x: 150, y: 50, glowColor: '#FFC0CB' },
      { id: 2, x: 250, y: 50, glowColor: '#ADD8E6' },
      { id: 3, x: 100, y: 100, glowColor: '#FFC0CB' },
      { id: 4, x: 180, y: 100, glowColor: '#FFC0CB' },
      { id: 5, x: 220, y: 100, glowColor: '#ADD8E6' },
      { id: 6, x: 300, y: 100, glowColor: '#ADD8E6' },
      { id: 7, x: 120, y: 150, glowColor: '#FFC0CB' },
      { id: 8, x: 260, y: 150, glowColor: '#ADD8E6' },
    ],
    links: [
      { source: 'root', target: 1 },
      { source: 'root', target: 2 },
      { source: 1, target: 3 },
      { source: 1, target: 4 },
      { source: 2, target: 5 },
      { source: 2, target: 6 },
      { source: 3, target: 7 },
      { source: 5, target: 8 },
    ]
  },
};
