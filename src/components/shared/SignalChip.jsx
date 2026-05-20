import React from 'react';
import './SignalChip.css';

const SignalChip = ({ label, value, trend, icon, type = 'default' }) => {
  return (
    <div className={`signal-chip ${type}`}>
      {icon && <span className="signal-chip-icon">{icon}</span>}
      <div className="signal-chip-info">
        <span className="signal-chip-label">{label}</span>
        <div className="signal-chip-value-row">
          <span className="signal-chip-value">{value}</span>
          {trend && (
            <span className={`signal-chip-trend ${trend > 0 ? 'up' : 'down'}`}>
              {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default SignalChip;
