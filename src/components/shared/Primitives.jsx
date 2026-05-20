import React, { useState } from 'react';
import './SharedComponents.css';

/**
 * Shared primitive UI components for the Experience Spine.
 */

export const ExpandablePanel = ({ title, children, summary }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={`expandable-panel ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="panel-header" onClick={() => setIsExpanded(!isExpanded)}>
        <h4>{title}</h4>
        <span className="expand-icon">{isExpanded ? '−' : '＋'}</span>
      </div>
      <div className="panel-content">
        {!isExpanded && summary && <div className="panel-summary">{summary}</div>}
        {isExpanded && <div className="panel-details">{children}</div>}
      </div>
    </div>
  );
};

// Re-export specific implementations from their dedicated files to avoid duplication
export { default as FocusCard } from './FocusCard';
export { default as SignalChip } from './SignalChip';
export { default as ContextTray } from '../ExperienceShell/ContextTray';
