import React from 'react';
import { useProgression } from '../hooks/useProgression';
import './ProgressionGuard.css';

/**
 * Guard component to hide/lock content based on progression.
 */
export const ProgressionGuard = ({ system, children, fallback = null, lockOverlay = false }) => {
  const { isUnlocked, loading } = useProgression();

  if (loading) return null;

  if (isUnlocked(system)) {
    return <>{children}</>;
  }

  if (lockOverlay) {
    return (
      <div className="progression-locked-overlay">
        <div className="lock-content">
          <span className="lock-icon">🔒</span>
          <h4>System Locked</h4>
          <p>Increase your contribution and trust level to unlock this coordination layer.</p>
        </div>
        <div className="locked-content-blur">
          {children}
        </div>
      </div>
    );
  }

  return fallback;
};
