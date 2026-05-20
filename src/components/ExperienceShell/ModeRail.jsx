import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Tooltip } from '@mui/material';
import { CORE_MODES, isRouteActive } from '../../utils/platformNavigation';
import { useUserRoleProfile } from '../../hooks/useUserRoleProfile';
import './ModeRail.css';

const ModeRail = () => {
  const location = useLocation();
  const { isNewUser, isGovernanceActive } = useUserRoleProfile();

  // Filter modes based on role/experience
  const visibleModes = CORE_MODES.filter(mode => {
    // Signals mode is hidden for brand new users unless they have governance activity
    if (mode.label === 'Signals' && isNewUser && !isGovernanceActive) {
      return false;
    }
    return true;
  });

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
