import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Tooltip } from '@mui/material';
import { CORE_MODES, isRouteActive } from '../../utils/platformNavigation';
import './ModeRail.css';

const ModeRail = () => {
  const location = useLocation();

  return (
    <div className="mode-rail">
      <div className="mode-rail-items">
        {CORE_MODES.map((mode) => {
          const active = isRouteActive(location.pathname, mode);
          return (
            <Tooltip key={mode.path} title={mode.label} placement="right">
              <Link
                to={mode.path}
                className={`mode-rail-item ${active ? 'active' : ''}`}
              >
                <span className="mode-rail-icon">{mode.icon}</span>
                <span className="mode-rail-label">{mode.label}</span>
              </Link>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
};

export default ModeRail;
