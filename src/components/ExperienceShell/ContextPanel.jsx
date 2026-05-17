import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { getModeFromPath, MODE_CONFIGS } from '../../utils/modeContext';
import './ContextPanel.css';

const ContextPanel = () => {
  const location = useLocation();
  const modeKey = getModeFromPath(location.pathname);
  const config = MODE_CONFIGS[modeKey];

  if (!config) return null;

  return (
    <div className="context-panel-content">
      <div className="context-header">
        <span className="context-icon">{config.icon}</span>
        <h3 className="context-title">{config.label}</h3>
      </div>

      <nav className="context-secondary-nav">
        {config.secondaryNav.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`context-nav-item ${location.pathname === item.path ? 'active' : ''}`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="context-widgets">
        <div className="context-widget-placeholder">
          <small>CONTEXTUAL_SYSTEMS_ACTIVE</small>
        </div>
      </div>
    </div>
  );
};

export default ContextPanel;
