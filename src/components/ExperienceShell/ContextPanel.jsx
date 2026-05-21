import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { getModeFromPath, MODE_CONFIGS } from '../../utils/modeContext';
import { useUserProfile } from '../../hooks/useUserProfile';
import useAssignedTasks from '../../hooks/useAssignedTasks';
import { api } from '../../utils/api';
import './ContextPanel.css';

const WidgetContent = ({ type, profile }) => {
  const { assignedTasks } = useAssignedTasks(profile?.id);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        if (type === 'matches') {
          const res = await api.get('/needs/matches');
          setData(res.data?.slice(0, 3) || []);
        } else if (type === 'signals') {
          const res = await api.get('/intelligence/pulse');
          setData(res.data?.signals?.filter(s => s.type === 'social').slice(0, 3) || []);
        } else if (type === 'governance') {
          const res = await api.get('/proposals?status=active');
          setData(res.data?.length || 0);
        }
      } catch (err) {
        console.error(`Error fetching widget data for ${type}:`, err);
      } finally {
        setLoading(false);
      }
    };

    if (['matches', 'signals', 'governance'].includes(type)) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [type]);

  if (loading) return <div className="shimmer-line"></div>;

  switch (type) {
    case 'focus':
      const topTask = assignedTasks?.[0];
      return topTask ? (
        <div className="widget-focus-item">
          <p className="widget-item-title">{topTask.name}</p>
          <small>{topTask.projectName}</small>
        </div>
      ) : <p className="empty-widget">No active tasks</p>;

    case 'stats':
      const exp = profile?.experience || { total_xp: 0, current_level: 1 };
      return (
        <div className="widget-stats">
          <div className="stat-row"><span>LVL</span> <span>{exp.current_level}</span></div>
          <div className="stat-row"><span>XP</span> <span>{exp.total_xp.toLocaleString()}</span></div>
        </div>
      );

    case 'matches':
      return data?.length > 0 ? (
        <ul className="widget-list">
          {data.map((match, i) => <li key={i}>{match.title || match.name}</li>)}
        </ul>
      ) : <p className="empty-widget">No matches found</p>;

    case 'signals':
      return data?.length > 0 ? (
        <ul className="widget-list">
          {data.map((sig, i) => <li key={i}>{sig.message}</li>)}
        </ul>
      ) : <p className="empty-widget">No active signals</p>;

    case 'governance':
      return (
        <div className="widget-gov">
          <p className="gov-count">{data}</p>
          <small>Active Proposals</small>
        </div>
      );

    case 'analytics':
      return (
        <div className="widget-analytics">
          <div className="impact-meter">
            <div className="meter-fill" style={{ width: '78%' }}></div>
          </div>
          <small>System Impact: 78%</small>
        </div>
      );

    default:
      return <div className="widget-placeholder-content"><div className="shimmer-line"></div></div>;
  }
};

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
              <WidgetContent type={widget.type} profile={profile} />
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
