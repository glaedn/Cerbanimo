import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Tooltip } from '@mui/material';
import { isRouteActive } from '../../utils/platformNavigation';
import { useUserProfile } from '../../hooks/useUserProfile';
import { useAdaptiveNavigation } from '../../hooks/useAdaptiveNavigation';
import './ModeRail.css';

const ModeRail = () => {
  const location = useLocation();
  const { profile } = useUserProfile();
  const { visibleModes } = useAdaptiveNavigation(profile);

  return (
    <div className="mode-rail">
      <div className="mode-rail-items">
        {visibleModes.map((mode) => {
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
