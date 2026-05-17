import React, { useState } from 'react';
import './SharedComponents.css';

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

export const ContextTray = ({ isOpen, onClose, children, title }) => {
  if (!isOpen) return null;
  return (
    <div className="context-tray-overlay" onClick={onClose}>
      <div className="context-tray" onClick={(e) => e.stopPropagation()}>
        <div className="tray-header">
          <h3>{title}</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="tray-body">{children}</div>
      </div>
    </div>
  );
};

export const FocusCard = ({ title, description, actionLabel, onAction }) => (
  <div className="focus-card">
    <h3>{title}</h3>
    <p>{description}</p>
    {actionLabel && <button onClick={onAction}>{actionLabel}</button>}
  </div>
);

export const SignalChip = ({ label, type = 'info' }) => (
  <span className={`signal-chip ${type}`}>{label}</span>
);
