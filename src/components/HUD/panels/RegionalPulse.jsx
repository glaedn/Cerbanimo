import React, { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useAppStore } from '../../../store/useAppStore';
import SpatialDataService from '../../../services/SpatialDataService';
import { Activity, Shield, Users, Zap, Heart, TrendingUp } from 'lucide-react';
import styled from '@emotion/styled';

const PulseContainer = styled.div`
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(0, 243, 255, 0.2);
  border-radius: 12px;
  padding: 16px;
  color: #fff;
  font-family: 'Orbitron', sans-serif;
  width: 100%;
  max-width: 280px;
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
  box-sizing: border-box;
`;

const MetricRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
`;

const ProgressBar = styled.div`
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
  margin-top: 4px;
`;

const ProgressFill = styled.div`
  height: 100%;
  width: ${props => props.value}%;
  background: ${props => {
    if (props.type === 'strain') return props.value > 70 ? '#ff3333' : '#ff9900';
    return props.value > 70 ? '#00ff66' : '#00f3ff';
  }};
  box-shadow: 0 0 10px ${props => props.type === 'strain' ? 'rgba(255,0,0,0.5)' : 'rgba(0,243,255,0.5)'};
`;

const RegionalPulse = ({ regionId = 1 }) => {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHealth = async () => {
      setLoading(true);
      let token = null;
      if (isAuthenticated) {
        try {
          token = await getAccessTokenSilently();
        } catch (e) {
          console.error("Token error in RegionalPulse:", e);
        }
      }
      const data = await SpatialDataService.getRegionalHealth(regionId, token);
      setHealth(data);
      setLoading(false);
    };
    fetchHealth();

    const interval = setInterval(fetchHealth, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, [regionId, getAccessTokenSilently, isAuthenticated]);

  if (loading && !health) return <PulseContainer>Analyzing Regional Bio-Metrics...</PulseContainer>;

  return (
    <PulseContainer>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <Activity size={20} color="#00f3ff" className="pulse-animation" />
        <h3 style={{ margin: 0, fontSize: '0.8rem', letterSpacing: '2px', color: '#00f3ff' }}>REGIONAL PULSE</h3>
      </div>

      <div style={{ fontSize: '0.65rem', color: '#888', marginBottom: '12px', textTransform: 'uppercase' }}>
        Sector: {health?.region_name || 'BUFFALO-CENTRAL'}
      </div>

      <div className="metrics-grid" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div>
          <MetricRow>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem' }}>
              <Zap size={12} color="#ff9900" />
              <span>CIVIC STRAIN</span>
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: health?.civic_strain_indicator > 7 ? '#ff3333' : '#fff' }}>
              {(health?.civic_strain_indicator * 10 || 42).toFixed(1)}%
            </span>
          </MetricRow>
          <ProgressBar><ProgressFill value={health?.civic_strain_indicator * 10 || 42} type="strain" /></ProgressBar>
        </div>

        <div>
          <MetricRow>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem' }}>
              <Shield size={12} color="#00ff66" />
              <span>READINESS SCORE</span>
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>
              {(health?.response_readiness_score || 88).toFixed(1)}%
            </span>
          </MetricRow>
          <ProgressBar><ProgressFill value={health?.response_readiness_score || 88} type="readiness" /></ProgressBar>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: '4px', textAlign: 'center' }}>
                <Users size={14} color="#00f3ff" style={{ margin: '0 auto 4px' }} />
                <div style={{ fontSize: '0.55rem', color: '#888' }}>TRUST INDEX</div>
                <div style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{health?.trust_index || 7.8}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: '4px', textAlign: 'center' }}>
                <TrendingUp size={14} color="#00ff66" style={{ margin: '0 auto 4px' }} />
                <div style={{ fontSize: '0.55rem', color: '#888' }}>THROUGHPUT</div>
                <div style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>14/hr</div>
            </div>
        </div>
      </div>

      <div style={{ marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.6rem', color: '#00f3ff' }}>
              <Heart size={10} fill="#00f3ff" />
              <span>MUTUAL AID FLOW: STABLE</span>
          </div>
      </div>
    </PulseContainer>
  );
};

export default RegionalPulse;
