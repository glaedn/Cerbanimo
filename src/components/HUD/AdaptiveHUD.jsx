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
import { useEcosystemData } from '../../hooks/useEcosystemData';
import { ChevronUp, ChevronDown, Monitor, Layout, Settings, Check } from 'lucide-react';
import './SpaceshipHUD.css'; // Reusing base HUD styles

const AdaptiveHUD = ({ children }) => {
  useEcosystemData(); // Initialize data fetching
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
    togglePanelCollapse,
    togglePanel
  } = useAppStore();

  const [showConfig, setShowConfig] = React.useState(false);
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

      {/* Mode Switcher & Config */}
      <div style={{ position: 'fixed', bottom: '60px', left: '20px', zIndex: 1000, display: 'flex', gap: '8px' }}>
        <button
          onClick={() => setHudMode(hudMode === 'normal' ? 'operational' : 'normal')}
          style={{ background: 'rgba(0, 243, 255, 0.2)', border: '1px solid #00f3ff', color: '#00f3ff', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', fontFamily: 'Orbitron', fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '8px', backdropFilter: 'blur(10px)' }}
        >
          {hudMode === 'normal' ? <Layout size={14} /> : <Monitor size={14} />}
          {hudMode === 'normal' ? 'OPERATIONAL HUD' : 'DASHBOARD VIEW'}
        </button>
        <button
          onClick={() => setShowConfig(!showConfig)}
          style={{ background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '8px', borderRadius: '4px', cursor: 'pointer' }}
        >
          <Settings size={14} />
        </button>
      </div>

      {showConfig && (
        <div style={{ position: 'fixed', bottom: '110px', left: '20px', background: 'rgba(10, 10, 46, 0.95)', border: '1px solid #00f3ff', borderRadius: '8px', padding: '16px', zIndex: 1001, width: '220px', boxShadow: '0 0 20px rgba(0,243,255,0.3)', backdropFilter: 'blur(15px)' }}>
          <h4 style={{ margin: '0 0 12px 0', fontFamily: 'Orbitron', fontSize: '0.75rem', color: '#00f3ff' }}>HUD CONFIGURATION</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { id: 'signals', label: 'Ecosystem Signals' },
              { id: 'river', label: 'Event River' },
              { id: 'pulse', label: 'Coordination Pulse' },
              { id: 'mission', label: 'Mission Control' },
              { id: 'crisis', label: 'Crisis Console' }
            ].map(panel => (
              <div
                key={panel.id}
                onClick={() => togglePanel(panel.id)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px', background: activePanels.includes(panel.id) ? 'rgba(0,243,255,0.1)' : 'transparent', border: '1px solid', borderColor: activePanels.includes(panel.id) ? '#00f3ff' : 'rgba(255,255,255,0.1)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem' }}
              >
                <span style={{ color: activePanels.includes(panel.id) ? '#fff' : '#888' }}>{panel.label}</span>
                {activePanels.includes(panel.id) && <Check size={12} color="#00f3ff" />}
              </div>
            ))}
          </div>
          <div style={{ marginTop: '12px', fontSize: '0.6rem', color: '#666', fontStyle: 'italic' }}>Max 6 active items.</div>
        </div>
      )}

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
