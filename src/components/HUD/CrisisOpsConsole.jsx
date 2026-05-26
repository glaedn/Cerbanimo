import React from 'react';
import styled from '@emotion/styled';
import { useAppStore } from '../../store/useAppStore';
import { ShieldAlert, Zap, MapPin, Truck, Activity, Navigation, Crosshair } from 'lucide-react';
import theme from '../../styles/theme';

const Container = styled.div`
  width: 100%;
  max-width: 360px;
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid ${theme.tokens.colors.status.crisis};
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
  box-sizing: border-box;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 0, 0, 0.3);
  padding-bottom: 10px;
`;

const CrisisTitle = styled.h2`
  margin: 0;
  font-family: 'Orbitron', sans-serif;
  font-size: 1rem;
  color: ${theme.tokens.colors.status.crisis};
  text-transform: uppercase;
  letter-spacing: 2px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const DispatchItem = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 65, 54, 0.2);
  padding: 12px;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const HealthIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(0, 0, 0, 0.3);
  padding: 10px;
  border-radius: 6px;
`;

const CrisisOpsConsole = () => {
  const { realtimeEvents, setMapState, setViewMode } = useAppStore();
  const crisisEvents = realtimeEvents.filter(e => e.severity > 80 || e.type?.includes('crisis'));

  const jumpToCrisis = (event) => {
    if (event.location) {
      setMapState({
        latitude: event.location.y,
        longitude: event.location.x,
        zoom: 15,
        pitch: 60
      });
      setViewMode('map');
    }
  };

  return (
    <Container>
      <Header>
        <CrisisOpsConsole.Title />
        <ShieldAlert size={20} color={theme.tokens.colors.status.crisis} className="animate-pulse" />
      </Header>

      <div>
        <h4 style={{ fontSize: '0.7rem', color: '#888', textTransform: 'uppercase', marginBottom: '8px' }}>Regional Strain Index</h4>
        <HealthIndicator>
          <Activity size={24} color={theme.tokens.colors.status.crisis} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
              <span>System Strain</span>
              <span style={{ color: theme.tokens.colors.status.crisis }}>CRITICAL</span>
            </div>
            <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: '88%', height: '100%', background: theme.tokens.colors.status.crisis }}></div>
            </div>
          </div>
        </HealthIndicator>
      </div>

      <div>
        <h4 style={{ fontSize: '0.7rem', color: '#888', textTransform: 'uppercase', marginBottom: '8px' }}>Live Dispatch Queue</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {crisisEvents.slice(0, 3).map((event, i) => (
            <DispatchItem key={i}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#fff' }}>{event.title || 'Urgent Need'}</span>
                <span style={{ fontSize: '0.7rem', color: theme.tokens.colors.status.crisis }}>{event.urgency}%</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', color: '#aaa' }}>
                <MapPin size={10} /> {event.region || 'Unknown Location'}
              </div>
              <div style={{ marginTop: '4px', display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => jumpToCrisis(event)}
                  style={{ flex: 1, background: 'rgba(255, 65, 54, 0.3)', border: '1px solid rgba(255, 65, 54, 0.6)', borderRadius: '3px', color: '#fff', fontSize: '0.6rem', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                  <Crosshair size={10} /> TARGET
                </button>
                <button style={{ flex: 1, background: 'rgba(255, 255, 255, 0.1)', border: 'none', borderRadius: '3px', color: '#fff', fontSize: '0.6rem', padding: '6px' }}>RESOLVE</button>
              </div>
            </DispatchItem>
          ))}
          {crisisEvents.length === 0 && (
             <div style={{ textAlign: 'center', padding: '20px', color: '#555', border: '1px dashed #444', borderRadius: '6px' }}>
                No active tactical dispatches.
             </div>
          )}
        </div>
      </div>

      <div style={{ background: 'rgba(0, 243, 255, 0.05)', padding: '10px', borderRadius: '6px', borderLeft: `3px solid ${theme.tokens.colors.brand.primary}` }}>
         <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: theme.tokens.colors.brand.primary }}>
           <Truck size={14} /> 4 LOGISTICS ASSETS INBOUND
         </div>
      </div>
    </Container>
  );
};

CrisisOpsConsole.Title = () => <CrisisTitle>Crisis Ops</CrisisTitle>;

export default CrisisOpsConsole;
