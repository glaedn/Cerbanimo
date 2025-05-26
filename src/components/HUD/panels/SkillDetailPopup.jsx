import React, { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import './SkillDetailPopup.css';
import theme from '../../../styles/theme'; // Adjust path as necessary

const SkillDetailPopup = ({ skillData, onClose, parentRef }) => {
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
  }, [parentRef, skillData]);

  if (!skillData || !parentRect) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const popupContent = (
    <div 
      className="skill-detail-popup-overlay" 
      onClick={handleOverlayClick}
      style={{
        position: 'fixed',
        top: parentRect.top,
        left: parentRect.left,
        width: parentRect.width,
        height: parentRect.height,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10000
      }}
    >
      <div className="skill-detail-popup-content" style={{ backgroundColor: theme.colors.backgroundPaper, color: theme.colors.textPrimary }}>
        <button className="skill-detail-popup-close" onClick={onClose}>&times;</button>
        <h3 style={{ color: theme.colors.primary }}>{skillData.name}</h3>
        <p><strong>Category:</strong> <span style={{textTransform: 'capitalize'}}>{skillData.category}</span></p>
        <p><strong>Level:</strong> {skillData.level}</p>
        <p><strong>Experience:</strong> {skillData.experience}</p>
        <p><strong>Next Level At:</strong> {skillData.experienceNeeded}</p>
        {skillData.originalData?.description && (
            <p><strong>Description:</strong> {skillData.originalData.description}</p>
        )}
      </div>
    </div>
  );

  // Render the popup directly to document.body to escape D3's transform context
  return createPortal(popupContent, document.body);
};

export default SkillDetailPopup;