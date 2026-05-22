import React, { useState, useMemo } from 'react';
import { useUserProfile } from '../../hooks/useUserProfile';
import useAssignedTasks from '../../hooks/useAssignedTasks';
import './RootTasks.css';

const RootTasks = ({ spineHeight }) => {
  const { profile } = useUserProfile();
  const { assignedTasks } = useAssignedTasks(profile?.id);
  const ROOT_ORIGIN = {
    x: 195,
    y: 10
  };

  const { nodes, branches } = useMemo(() => {
    if (!assignedTasks || assignedTasks.length === 0) {
      return { nodes: [], branches: [] };
    }

    const newNodes = assignedTasks.map((task, i) => {
      const angle = (Math.PI / (assignedTasks.length + 1)) * (i + 1);
      const radius = 80 + (i % 3) * 20;
      const cx = ROOT_ORIGIN.x + radius * Math.cos(angle + Math.PI / 2) * (i % 2 === 0 ? 1 : -1);
      const cy = ROOT_ORIGIN.y + radius * Math.sin(angle);

      return {
        id: task.id,
        cx,
        cy,
        r: 8,
        color: task.status === 'completed' ? '#4ade80' : '#70D6FF',
        title: task.name,
        skillType: task.status
      };
    });

    const newBranches = newNodes.map(node => ({
      id: `b-${node.id}`,
      to: { x: node.cx, y: node.cy }
    }));

    return { nodes: newNodes, branches: newBranches };
  }, [assignedTasks]);

  const ROOT_HEIGHT = spineHeight * 0.28;
  const handleNodeClick = (node) => {
    setSelectedNode(node);
  };
  const [loading, setLoading] = useState(false);


  return (
    <div className="root-tasks-container">
      <svg
        width="100%"
        height={ROOT_HEIGHT}
        viewBox={`0 0 390 ${ROOT_HEIGHT}`}
      >
        {branches.map(branch => (
          <line
            key={branch.id}
            x1={ROOT_ORIGIN.x}
            y1={ROOT_ORIGIN.y}
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
        <line
          x1={ROOT_ORIGIN.x}
          y1={ROOT_ORIGIN.y}
          x2={ROOT_ORIGIN.x}
          y2={ROOT_ORIGIN.y - 485}
          className="branch-line root-stem"
        />

      </svg>
    </div>
  );
};

export default RootTasks;
