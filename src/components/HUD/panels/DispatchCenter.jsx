import React, { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useAppStore } from '../../../store/useAppStore';
import SpatialDataService from '../../../services/SpatialDataService';
import { Truck, MapPin, Navigation, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import styled from '@emotion/styled';

const DispatchContainer = styled.div`
  background: rgba(10, 10, 20, 0.9);
  border: 1px solid rgba(0, 243, 255, 0.3);
  border-radius: 8px;
  padding: 16px;
  color: #fff;
  font-family: 'Orbitron', sans-serif;
  max-height: 500px;
  overflow-y: auto;
  backdrop-filter: blur(10px);
  box-shadow: 0 0 30px rgba(0, 243, 255, 0.1);
`;

const RouteCard = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border-left: 3px solid ${props => props.status === 'active' ? '#00f3ff' : '#666'};
  padding: 12px;
  margin-bottom: 10px;
  border-radius: 4px;
  font-size: 0.75rem;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
`;

const DispatchCenter = () => {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();
  const { activeContext, setViewMode, setMapState } = useAppStore();
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRoutes = async () => {
      setLoading(true);
      let token = null;
      if (isAuthenticated) {
        try {
          token = await getAccessTokenSilently();
        } catch (e) {
          console.error("Token error in DispatchCenter:", e);
        }
      }
      const data = await SpatialDataService.getTacticalOverlay(token);
      // In a real scenario, we'd have a specific routes endpoint
      setRoutes(data.missions || []);
      setLoading(false);
    };
    fetchRoutes();
  }, [getAccessTokenSilently, isAuthenticated]);

  const jumpToRoute = (route) => {
      if (route.location) {
          setMapState({
              latitude: route.location.y,
              longitude: route.location.x,
              zoom: 14,
              transitionDuration: 1000
          });
          setViewMode('map');
      }
  };

  return (
    <DispatchContainer>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid rgba(0,243,255,0.2)', paddingBottom: '8px' }}>
        <Truck size={18} color="#00f3ff" />
        <h3 style={{ margin: 0, fontSize: '0.9rem', letterSpacing: '1px' }}>DISPATCH COMMAND</h3>
      </div>

      {loading ? (
        <div className="loading-shimmer">Scanning active routes...</div>
      ) : routes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px', color: '#666', fontSize: '0.7rem' }}>
            NO ACTIVE DISPATCHES IN CURRENT SECTOR
        </div>
      ) : (
        routes.map(route => (
          <RouteCard key={route.id} status={route.status} onClick={() => jumpToRoute(route)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: '#00f3ff', fontWeight: 'bold' }}>{route.name || `ROUTE-${route.id}`}</span>
              <span style={{ fontSize: '0.6rem', background: 'rgba(0,243,255,0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                {route.status?.toUpperCase()}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: '#aaa' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MapPin size={12} />
                <span>Dest: Sector {route.location?.x?.toFixed(2)}, {route.location?.y?.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={12} />
                <span>ETA: 14 Mins</span>
              </div>
            </div>

            <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
                <button style={{ flex: 1, background: 'rgba(0,243,255,0.2)', border: '1px solid #00f3ff', color: '#fff', fontSize: '0.6rem', padding: '4px', borderRadius: '2px', cursor: 'pointer' }}>
                    RE-ROUTE
                </button>
                <button style={{ flex: 1, background: 'rgba(255,255,255,0.1)', border: '1px solid #444', color: '#fff', fontSize: '0.6rem', padding: '4px', borderRadius: '2px', cursor: 'pointer' }}>
                    TRACK
                </button>
            </div>
          </RouteCard>
        ))
      )}

      <div style={{ marginTop: '16px', fontSize: '0.6rem', color: '#00f3ff', opacity: 0.6, textAlign: 'center', textTransform: 'uppercase' }}>
          Coordinate. Dispatch. Fulfill.
      </div>
    </DispatchContainer>
  );
};

export default DispatchCenter;
