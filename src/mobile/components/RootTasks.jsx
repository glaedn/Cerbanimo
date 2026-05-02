import React, { useState } from 'react';
import { dummyData } from '../dummyData';
import './RootTasks.css';

const RootTasks = () => {
  const { branches, nodes } = dummyData.rootTasks;
  const [selectedNode, setSelectedNode] = useState(null);

  const handleNodeClick = (node) => {
    setSelectedNode(node);
  };

  return (
    <div className="root-tasks-container">
      <svg width="390" height="200" viewBox="0 0 390 200">
        {/* Render Branches */}
        {branches.map(branch => (
          <line
            key={branch.id}
            x1={branch.from.x}
            y1={branch.from.y}
            x2={branch.to.x}
            y2={branch.to.y}
            className="branch-line"
          />
        ))}

        {/* Render Nodes */}
        {nodes.map(node => (
          <circle
            key={node.id}
            cx={node.cx}
            cy={node.cy}
            r={node.r}
            fill={node.color}
            className="task-node"
            onClick={() => handleNodeClick(node)}
          />
        ))}

        {/* Render Label for Selected Node */}
        {selectedNode && (
          <g>
            <rect
              x={selectedNode.cx - 50}
              y={selectedNode.cy + 15}
              width="100"
              height="40"
              rx="10"
              className="label-background"
            />
            <text
              x={selectedNode.cx}
              y={selectedNode.cy + 30}
              className="label-text title"
            >
              {selectedNode.title}
            </text>
            <text
              x={selectedNode.cx}
              y={selectedNode.cy + 45}
              className="label-text skill"
            >
              {selectedNode.skillType}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
};

export default RootTasks;
