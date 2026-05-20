import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { getModeFromPath, MODE_CONFIGS } from '../../utils/modeContext';
import { useUserProfile } from '../../hooks/useUserProfile';
import './ContextPanel.css';

const ContextPanel = () => {
  const location = useLocation();
  const { profile } = useUserProfile();
  const modeKey = getModeFromPath(location.pathname);
  const config = MODE_CONFIGS[modeKey];

  const unlockedSystems = profile?.unlockedSystems || {};

  if (!config) return null;

  return (
    <div className="context-panel-content glass-panel">
      <div className="context-header">
        <span className="context-icon">{config.icon}</span>
        <div className="context-info">
          <h3 className="context-title">{config.label}</h3>
          <span className="context-status">SYSTEM_ACTIVE</span>
        </div>
      </div>

      <nav className="context-secondary-nav">
        {config.secondaryNav.filter(item => {
          if (item.label === 'Federation' && !unlockedSystems.federation) return false;
          if (item.label === 'Crisis' && !unlockedSystems.crisisManagement) return false;
          if (item.label === 'Review' && profile?.roleProfile?.primaryRole !== 'Coordinator') return false;
          return true;
        }).map((item) => {
          const isActive = location.pathname === item.path ||
                          (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`context-nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="nav-indicator"></span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="context-widgets">
        <h4 className="widgets-label">Contextual Systems</h4>
        {config.widgets?.map(widget => (
          <div key={widget.id} className="context-widget-card">
            <div className="widget-header">
              <span className="widget-label">{widget.label}</span>
              <span className="widget-type-tag">{widget.type.toUpperCase()}</span>
            </div>
            <div className="widget-body">
              <div className="widget-placeholder-content">
                <div className="shimmer-line"></div>
              </div>
            </div>
          </div>
        ))}
        {!config.widgets && (
          <div className="context-widget-placeholder">
            <small>NO_CONTEXTUAL_WIDGETS_AVAILABLE</small>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContextPanel;
