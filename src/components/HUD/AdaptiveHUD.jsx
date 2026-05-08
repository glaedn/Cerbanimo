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
import { ChevronUp, ChevronDown, Monitor, Layout } from 'lucide-react';
import './SpaceshipHUD.css'; // Reusing base HUD styles

const AdaptiveHUD = ({ children }) => {
  const {
    activeContext,
    setActiveContext,
    realtimeEvents,
    selectedEntity,
    isCrisisMode,
    setCrisisMode,
    hudMode,
    setHudMode,
    activePanels,
    collapsedPanels,
    togglePanelCollapse
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

  const renderPanel = (panelId) => {
    const isCollapsed = collapsedPanels.includes(panelId);

    switch (panelId) {
      case 'signals':
        return (
          <div className="panel-wrapper signal-feed-panel" key="signals">
             <div className="hud-panel" style={{ maxWidth: '300px' }}>
                <div className="hud-panel-header" onClick={() => togglePanelCollapse('signals')} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4>Ecosystem Signals</h4>
                  {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                </div>
                {!isCollapsed && <SignalFeed />}
              </div>
          </div>
        );
      case 'river':
        return <div className="panel-wrapper event-river-panel" key="river"><EventRiver /></div>;
      case 'mission':
        return <div className="panel-wrapper mission-control-panel" key="mission"><MissionControlInterface /></div>;
      case 'crisis':
        return <div className="panel-wrapper crisis-ops-panel" key="crisis"><CrisisOpsConsole /></div>;
      case 'pulse':
        return <div className="panel-wrapper pulse-hud-panel" key="pulse"><CoordinationPulseHUD /></div>;
      default:
        return null;
    }
  };

  const renderContextualUI = () => {
    if (hudMode === 'operational') {
      switch (activeContext) {
        case 'mission':
          return <MissionControlInterface />;
        case 'crisis':
          return <CrisisOpsConsole />;
        case 'governance':
          return <div className="governance-overlay">Governance View (TBD)</div>;
        default:
          return activePanels.slice(0, 6).map(renderPanel);
      }
    }

    // Normal Dashboard HUD: customizable items
    return (
      <div className="dashboard-hud-layers">
        {activePanels.slice(0, 6).map(renderPanel)}
      </div>
    );
  };

  return (
    <div className={`hud-container ${isMobile ? 'mobile-hud' : ''} context-${activeContext} mode-${hudMode}`}>
      <PresenceIndicators />
      <OverlayManager />

      {/* Mode Switcher */}
      <div style={{ position: 'fixed', top: '10px', left: '10px', z_index: 200, display: 'flex', gap: '8px' }}>
        <button
          onClick={() => setHudMode(hudMode === 'normal' ? 'operational' : 'normal')}
          style={{ background: 'rgba(0, 243, 255, 0.2)', border: '1px solid #00f3ff', color: '#00f3ff', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontFamily: 'Orbitron', fontSize: '0.6rem', display: 'flex', alignItems: 'center', gap: '5px' }}
        >
          {hudMode === 'normal' ? <Layout size={12} /> : <Monitor size={12} />}
          {hudMode === 'normal' ? 'OPERATIONAL HUD' : 'DASHBOARD VIEW'}
        </button>
      </div>

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
