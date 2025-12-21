// src/mobile/dummyData.js

export const dummyData = {
  title: 'Global Makers Society',
  rootTasks: {
    // The central point from which roots emerge
    origin: { x: 195, y: 0 },
    // Branch lines
    branches: [
      { id: 'b1', from: { x: 195, y: 0 }, to: { x: 195, y: 30 } },
      { id: 'b2', from: { x: 195, y: 30 }, to: { x: 155, y: 60 } },
      { id: 'b3', from: { x: 195, y: 30 }, to: { x: 235, y: 60 } },
      { id: 'b4', from: { x: 155, y: 60 }, to: { x: 125, y: 90 } },
      { id: 'b5', from: { x: 155, y: 60 }, to: { x: 185, y: 90 } },
      { id: 'b6', from: { x: 235, y: 60 }, to: { x: 205, y: 90 } },
      { id: 'b7', from: { x: 235, y: 60 }, to: { x: 265, y: 90 } },
      { id: 'b8', from: { x: 125, y: 90 }, to: { x: 110, y: 120 } },
      { id: 'b9', from: { x: 185, y: 90 }, to: { x: 170, y: 120 } },
      { id: 'b10', from: { x: 265, y: 90 }, to: { x: 280, y: 120 } },
      { id: 'b11', from: { x: 195, y: 30 }, to: { x: 195, y: 110 } },
    ],
    // Task nodes
    nodes: [
      { id: 'n1', cx: 125, cy: 90, r: 8, color: '#FF8FAB', title: 'Task 1', skillType: 'Design' },
      { id: 'n2', cx: 185, cy: 90, r: 8, color: '#FF8FAB', title: 'Task 2', skillType: 'Engineering' },
      { id: 'n3', cx: 205, cy: 90, r: 8, color: '#FF8FAB', title: 'Task 3', skillType: 'Gardening' },
      { id: 'n4', cx: 280, cy: 120, r: 8, color: '#70D6FF', title: 'Task 4', skillType: 'Content' },
      { id: 'n5', cx: 110, cy: 120, r: 8, color: '#FF8FAB', title: 'Task 5', skillType: 'Community' },
      { id: 'n6', cx: 170, cy: 120, r: 8, color: '#FF8FAB', title: 'Task 6', skillType: 'Plumbing' },
      { id: 'n7', cx: 235, cy: 60, r: 8, color: '#FFC4D6', title: 'Task 7', skillType: 'Cooking' },
      { id: 'n8', cx: 195, cy: 110, r: 8, color: '#70D6FF', title: 'Task 8', skillType: 'Design' },
      { id: 'n9', cx: 155, cy: 150, r: 8, color: '#FF8FAB', title: 'Fix the gutters', skillType: 'Construction' },
    ]
  }
};
