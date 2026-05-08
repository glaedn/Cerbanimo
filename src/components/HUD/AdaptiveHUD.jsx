import React, { useEffect, useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import EventRiver from './EventRiver';
import MissionControlInterface from './MissionControlInterface';
import CrisisOpsConsole from './CrisisOpsConsole';
import CoordinationPulseHUD from './CoordinationPulseHUD';
import PresenceIndicators from './PresenceIndicators';
import OverlayManager from './OverlayManager';
import StatusBar from './panels/StatusBar';
import SignalFeed from './panels/SignalFeed';
import EntityInspector from './panels/EntityInspector';
import { useWindowSize } from '../../hooks/useWindowSize';
import './SpaceshipHUD.css'; // Reusing base HUD styles

const AdaptiveHUD = ({ children }) => {
  const {
    activeContext,
    setActiveContext,
    realtimeEvents,
    selectedEntity,
    isCrisisMode,
    setCrisisMode
  } = useAppStore();

  const { width } = useWindowSize();
  const isMobile = width <= 768;

  // --- ADAPTIVE RULES ENGINE ---
  useEffect(() => {
    if (realtimeEvents.length === 0) return;

    const latestEvent = realtimeEvents[0];

    // Rule: Auto-switch to Crisis Mode if a critical regional event is detected
    if (latestEvent.type === 'crisis.detected' || (latestEvent.severity > 90 && latestEvent.type === 'spatial.strain')) {
      if (!isCrisisMode) {
        setCrisisMode(true);
        setActiveContext('crisis');
        console.log('[AdaptiveHUD] Triggering CRISIS_MODE based on ecosystem signal');
      }
    }

    // Rule: Switch to Mission Mode if user is actively interacting with a mission-critical task
    if (selectedEntity?.type === 'task' && activeContext === 'normal') {
        setActiveContext('mission');
    }
  }, [realtimeEvents, selectedEntity, isCrisisMode, activeContext, setCrisisMode, setActiveContext]);

  const renderContextualUI = () => {
    switch (activeContext) {
      case 'mission':
        return <MissionControlInterface />;
      case 'crisis':
        return <CrisisOpsConsole />;
      case 'governance':
        return <div className="governance-overlay">Governance View (TBD)</div>;
      default:
        return (
          <>
            <div className="panel-wrapper signal-feed-panel">
               <div className="hud-panel" style={{ maxWidth: '300px' }}>
                  <div className="hud-panel-header">
                    <h4>Ecosystem Signals</h4>
                  </div>
                  <SignalFeed />
                </div>
            </div>
            <div className="panel-wrapper event-river-panel">
               <EventRiver />
            </div>
          </>
        );
    }
  };

  return (
    <div className={`hud-container ${isMobile ? 'mobile-hud' : ''} context-${activeContext}`}>
      <PresenceIndicators />
      <OverlayManager />

      {/* Dynamic Operational Content */}
      <div className="hud-operational-layer">
        {renderContextualUI()}
      </div>

      {/* Persistent Telemetry */}
      <div className="hud-telemetry-layer">
        <CoordinationPulseHUD />
      </div>

      {/* Contextual Entity Inspector */}
      {selectedEntity && (
        <div className="panel-wrapper entity-inspector-panel">
          <EntityInspector />
        </div>
      )}

      {/* Background/Central Content */}
      <div className="hud-map-viewport">
        {children}
      </div>

      <StatusBar />
    </div>
  );
};

export default AdaptiveHUD;
