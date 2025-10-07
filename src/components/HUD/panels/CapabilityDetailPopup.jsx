import React, { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import './CapabilityDetailPopup.css';
import theme from '../../../styles/theme'; // Adjust path as necessary

const CapabilityDetailPopup = ({ capabilityData, onClose, parentRef }) => {
  const [parentRect, setParentRect] = useState(null);

  useEffect(() => {
    if (parentRef?.current) {
      const rect = parentRef.current.getBoundingClientRect();
      setParentRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      });
    }
  }, [parentRef, capabilityData]);

  if (!capabilityData || !parentRect) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const popupContent = (
    <div
      className="capability-detail-popup-overlay"
      onClick={handleOverlayClick}
      style={{
        position: 'fixed',
        top: parentRect.top,
        left: parentRect.left,
        width: parentRect.width,
        height: parentRect.height,
        backgroundColor: 'rgba(0, 0, 0, 0.7)', // Ensure this is themed or consistent
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10000 // Ensure this is high enough
      }}
    >
      <div className="capability-detail-popup-content" style={{ backgroundColor: theme.colors.backgroundPaper, color: theme.colors.textSecondary }}>
        <button className="capability-detail-popup-close" onClick={onClose} style={{ color: theme.colors.textPrimary }}>&times;</button>
        <h3 style={{ color: theme.colors.primary }}>{capabilityData.name || capabilityData.originalData?.name}</h3>

        {capabilityData.category === 'star' ? (
          <>
            <p><strong>Category:</strong> <span style={{textTransform: 'capitalize'}}>{capabilityData.category}</span></p>
            <p><strong>Total Calculated Level:</strong> {capabilityData.levelForColor}</p>
            {capabilityData.userLevel > 0 && (
              <p><strong>Direct Star Level:</strong> {capabilityData.userLevel}</p>
            )}
            {capabilityData.originalData?.description && (
              <p><strong>Description:</strong> {capabilityData.originalData.description}</p>
            )}
            {capabilityData.constituentCapabilities && capabilityData.constituentCapabilities.length > 0 && (
              <div className="constituent-capabilities-section">
                <h4 className="constituent-capabilities-title" style={{color: theme.colors.accentHue1}}>Constituent Capabilities</h4>
                <ul className="constituent-capabilities-list">
                  {capabilityData.constituentCapabilities.map(cs => (
                    <li key={cs.id} className="constituent-capability-item">
                      {cs.name} - Lvl {cs.userLevel}
                      <span className="constituent-capability-category"> ({cs.category})</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <>
            <p><strong>Category:</strong> <span style={{textTransform: 'capitalize'}}>{capabilityData.category}</span></p>
            <p><strong>Level:</strong> {capabilityData.userLevel}</p>
            <p><strong>Experience:</strong> {capabilityData.experience}</p>
            <p><strong>Next Level At:</strong> {capabilityData.experienceNeeded}</p>
            {capabilityData.originalData?.description && (
              <p><strong>Description:</strong> {capabilityData.originalData.description}</p>
            )}
            {/* Optional: Progress Bar for non-stars */}
            {capabilityData.experienceNeeded > 0 && capabilityData.experience < capabilityData.experienceNeeded && (
                 <div className="capability-progress-bar-container" style={{backgroundColor: theme.colors.backgroundVariant}}>
                    <div
                        className="capability-progress-bar"
                        style={{
                            width: `${(capabilityData.experience / capabilityData.experienceNeeded) * 100}%`,
                            backgroundColor: theme.colors.primary
                        }}
                    ></div>
                </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  // Render the popup directly to document.body to escape D3's transform context and SVG rendering issues
  return createPortal(popupContent, document.body);
};

export default CapabilityDetailPopup;