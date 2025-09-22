import React, { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import './AffinityDetailPopup.css';
import theme from '../../../styles/theme'; // Adjust path as necessary

const AffinityDetailPopup = ({ affinityData, onClose, parentRef }) => {
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
  }, [parentRef, affinityData]);

  if (!affinityData || !parentRect) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const popupContent = (
    <div
      className="affinity-detail-popup-overlay"
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
      <div className="affinity-detail-popup-content" style={{ backgroundColor: theme.colors.backgroundPaper, color: theme.colors.textSecondary }}>
        <button className="affinity-detail-popup-close" onClick={onClose} style={{ color: theme.colors.textPrimary }}>&times;</button>
        <h3 style={{ color: theme.colors.primary }}>{affinityData.name || affinityData.originalData?.name}</h3>

        {affinityData.category === 'star' ? (
          <>
            <p><strong>Category:</strong> <span style={{textTransform: 'capitalize'}}>{affinityData.category}</span></p>
            <p><strong>Total Calculated Level:</strong> {affinityData.levelForColor}</p>
            {affinityData.userLevel > 0 && (
              <p><strong>Direct Star Level:</strong> {affinityData.userLevel}</p>
            )}
            {affinityData.originalData?.description && (
              <p><strong>Description:</strong> {affinityData.originalData.description}</p>
            )}
            {affinityData.constituentAffinities && affinityData.constituentAffinities.length > 0 && (
              <div className="constituent-affinities-section">
                <h4 className="constituent-affinities-title" style={{color: theme.colors.accentHue1}}>{`Constituent ${theme.terminology.skill_plural}`}</h4>
                <ul className="constituent-affinities-list">
                  {affinityData.constituentAffinities.map(cs => (
                    <li key={cs.id} className="constituent-affinity-item">
                      {cs.name} - Lvl {cs.userLevel}
                      <span className="constituent-affinity-category"> ({cs.category})</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <>
            <p><strong>Category:</strong> <span style={{textTransform: 'capitalize'}}>{affinityData.category}</span></p>
            <p><strong>Level:</strong> {affinityData.userLevel}</p>
            <p><strong>Experience:</strong> {affinityData.experience}</p>
            <p><strong>Next Level At:</strong> {affinityData.experienceNeeded}</p>
            {affinityData.originalData?.description && (
              <p><strong>Description:</strong> {affinityData.originalData.description}</p>
            )}
            {/* Optional: Progress Bar for non-stars */}
            {affinityData.experienceNeeded > 0 && affinityData.experience < affinityData.experienceNeeded && (
                 <div className="affinity-progress-bar-container" style={{backgroundColor: theme.colors.backgroundVariant}}>
                    <div
                        className="affinity-progress-bar"
                        style={{
                            width: `${(affinityData.experience / affinityData.experienceNeeded) * 100}%`,
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

export default AffinityDetailPopup;