import React from 'react';
import styled from '@emotion/styled';
import { useAppStore } from '../../store/useAppStore';
import theme from '../../styles/theme';
import { Layers, Shield, Truck, Link, EyeOff } from 'lucide-react';

const OverlayToggleBar = styled.div`
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 10px;
  background: rgba(255, 255, 255, 0.03);
  padding: 8px 16px;
  border-radius: 30px;
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 1000;
  pointer-events: auto;
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
`;

const ToggleButton = styled.button`
  background: ${props => props.active ? theme.tokens.colors.brand.primary : 'transparent'};
  border: none;
  border-radius: 20px;
  padding: 6px 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  color: ${props => props.active ? '#000' : theme.tokens.colors.text.muted};
  font-family: 'Orbitron', sans-serif;
  font-size: 0.65rem;
  transition: all 0.2s;

  &:hover {
    background: ${props => props.active ? theme.tokens.colors.brand.primary : 'rgba(255, 255, 255, 0.1)'};
  }
`;

const OverlayManager = () => {
  const { activeOverlays, toggleOverlay } = useAppStore();

  const overlays = [
    { id: 'crisis', icon: <Shield size={14} />, label: 'CRISIS' },
    { id: 'logistics', icon: <Truck size={14} />, label: 'LOGISTICS' },
    { id: 'trust', icon: <Link size={14} />, label: 'TRUST' },
    { id: 'governance', icon: <Layers size={14} />, label: 'GOV' },
  ];

  return (
    <>
      <OverlayToggleBar>
        {overlays.map(ov => (
          <ToggleButton
            key={ov.id}
            active={activeOverlays.includes(ov.id)}
            onClick={() => toggleOverlay(ov.id)}
          >
            {ov.icon}
            {ov.label}
          </ToggleButton>
        ))}
      </OverlayToggleBar>

      {/* Visual Overlay Renderers could be added here */}
      <div className="active-overlays-container" style={{ pointerEvents: 'none' }}>
        {activeOverlays.includes('crisis') && (
           <div style={{ position: 'fixed', inset: 0, border: '4px solid rgba(255, 0, 0, 0.1)', pointerEvents: 'none', zIndex: 50 }}></div>
        )}
      </div>
    </>
  );
};

export default OverlayManager;
