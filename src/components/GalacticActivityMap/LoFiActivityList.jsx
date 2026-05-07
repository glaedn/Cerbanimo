import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './LoFiActivityList.css';

const LoFiActivityList = ({ starData = [] }) => {
  const navigate = useNavigate();
  const [expandedIds, setExpandedIds] = useState(new Set());

  const getRelevance = useCallback((item) => {
    let s = 0;
    const age = (Date.now() - new Date(item.lastActivity).getTime()) / 86400000;
    s += Math.max(0, 0.5 * (1 - age / 30));
    const st = (item.status || "").toLowerCase();
    if (st.includes('urgent') || st.includes('critical')) s += 0.3;
    else if (st.includes('active')) s += 0.15;
    if (item.type === 'community') s += 0.2;
    else if (item.type === 'need') s += 0.15;
    else if (item.type === 'project') s += 0.1;
    else s += 0.05;
    return Math.min(1, s);
  }, []);

  const { tree, roots } = useMemo(() => {
    const nodesById = {};
    const treeMap = {};
    const rootNodes = [];

    starData.forEach(node => {
      nodesById[node.id] = node;
      treeMap[node.id] = [];
    });

    starData.forEach(node => {
      if (node.parentId && nodesById[node.parentId]) {
        treeMap[node.parentId].push(node);
      } else {
        rootNodes.push(node);
      }
    });

    // Sort function for children and roots
    const sortFn = (a, b) => {
      const relA = getRelevance(a);
      const relB = getRelevance(b);
      if (relB !== relA) return relB - relA;
      return new Date(b.lastActivity) - new Date(a.lastActivity);
    };

    rootNodes.sort(sortFn);
    Object.keys(treeMap).forEach(id => {
      treeMap[id].sort(sortFn);
    });

    return { tree: treeMap, roots: rootNodes };
  }, [starData, getRelevance]);

  const toggleExpand = (id) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const handleNavigate = (d) => {
    if (!d) return;
    const [type, idOnly] = d.id.split('-');
    if (type === "task" && d.raw_data?.project_id) navigate(`/Visualizer/${d.raw_data.project_id}/${idOnly}`);
    else if (type === "project") navigate(`/Visualizer/${idOnly}/`);
    else if (type === "community") navigate(`/communityhub/${idOnly}`);
    else if (type === "need") navigate(`/needs/${idOnly}`);
    else if (type === "resource") navigate(`/marketplace`); // Fallback for resources
  };

  const renderItem = (node, depth = 0) => {
    const children = tree[node.id] || [];
    const isExpanded = expandedIds.has(node.id);
    const hasChildren = children.length > 0;

    return (
      <div key={node.id} className="lofi-item-container" style={{ marginLeft: `${depth * 20}px` }}>
        <div className="lofi-item-row">
          <div
            className={`lofi-item-content ${hasChildren ? 'clickable' : ''}`}
            onClick={() => hasChildren && toggleExpand(node.id)}
          >
            {hasChildren && (
              <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>
                ▶
              </span>
            )}
            <span className={`item-type-tag type-${node.type}`}>{node.type.toUpperCase()}</span>
            <span className="item-name">{node.name}</span>
            <span className="item-status">({node.status})</span>
          </div>
          <button className="lofi-view-btn" onClick={() => handleNavigate(node)}>VIEW</button>
        </div>
        {isExpanded && children.map(child => renderItem(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="lofi-activity-list">
      <div className="lofi-list-header">
        <h2>System Activity Log (Lo-Fi Mode)</h2>
      </div>
      <div className="lofi-list-content">
        {roots.length > 0 ? roots.map(root => renderItem(root)) : <p>No activity detected.</p>}
      </div>
    </div>
  );
};

export default LoFiActivityList;
