import React from 'react';
import { dummyData } from '../dummyData';
import './RootTasks.css';

// Helper to find node by ID
const findNodeById = (nodes, id) => nodes.find(n => n.id === id);

const RootTasks = () => {
  const { links, nodes } = dummyData.rootTasks;

  // Basic data validation
  if (!links || !nodes) {
    console.error("RootTasks data is missing or malformed!");
    return <div className="root-tasks-container">Error loading tasks.</div>;
  }

  return (
    <div className="root-tasks-container">
      <svg className="root-tasks-svg" viewBox="0 0 400 200">
        {/* Render Links as branches */}
        {links.map((link, index) => {
          const sourceNode = findNodeById(nodes, link.source);
          const targetNode = findNodeById(nodes, link.target);

          // Don't render a line if a node isn't found
          if (!sourceNode || !targetNode) {
            return null;
          }

          return (
            <line
              key={index}
              x1={sourceNode.x}
              y1={sourceNode.y}
              x2={targetNode.x}
              y2={targetNode.y}
              className="root-branch"
            />
          );
        })}

        {/* Render Nodes */}
        {nodes.map(node => {
          // The root node is for positioning and shouldn't be rendered
          if (node.id === 'root') {
            return null;
          }
          return (
            <circle
              key={node.id}
              cx={node.x}
              cy={node.y}
              className="root-node"
              // Pass the glow color to the CSS via a custom property
              style={{ '--glow-color': node.glowColor }}
            />
          );
        })}
      </svg>
    </div>
  );
};

export default RootTasks;
