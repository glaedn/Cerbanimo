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
        backgroundColor: 'rgba(0, 0, 0, 0.7)', // Ensure this is themed or consistent
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10000 // Ensure this is high enough
      }}
    >
      <div className="skill-detail-popup-content" style={{ backgroundColor: theme.colors.backgroundPaper, color: theme.colors.textSecondary }}>
        <button className="skill-detail-popup-close" onClick={onClose} style={{ color: theme.colors.textPrimary }}>&times;</button>
        <h3 style={{ color: theme.colors.primary }}>{skillData.name || skillData.originalData?.name}</h3>
        
        {skillData.category === 'star' ? (
          <>
            <p><strong>Category:</strong> <span style={{textTransform: 'capitalize'}}>{skillData.category}</span></p>
            <p><strong>Total Calculated Level:</strong> {skillData.levelForColor}</p>
            {skillData.userLevel > 0 && (
              <p><strong>Direct Star Level:</strong> {skillData.userLevel}</p>
            )}
            {skillData.originalData?.description && (
              <p><strong>Description:</strong> {skillData.originalData.description}</p>
            )}
            {skillData.constituentSkills && skillData.constituentSkills.length > 0 && (
              <div className="constituent-skills-section">
                <h4 className="constituent-skills-title" style={{color: theme.colors.accentHue1}}>Constituent Skills</h4>
                <ul className="constituent-skills-list">
                  {skillData.constituentSkills.map(cs => (
                    <li key={cs.id} className="constituent-skill-item">
                      {cs.name} - Lvl {cs.userLevel} 
                      <span className="constituent-skill-category"> ({cs.category})</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <>
            <p><strong>Category:</strong> <span style={{textTransform: 'capitalize'}}>{skillData.category}</span></p>
            <p><strong>Level:</strong> {skillData.userLevel}</p> 
            <p><strong>Experience:</strong> {skillData.experience}</p>
            <p><strong>Next Level At:</strong> {skillData.experienceNeeded}</p>
            {skillData.originalData?.description && (
              <p><strong>Description:</strong> {skillData.originalData.description}</p>
            )}
            {/* Optional: Progress Bar for non-stars */}
            {skillData.experienceNeeded > 0 && skillData.experience < skillData.experienceNeeded && (
                 <div className="skill-progress-bar-container" style={{backgroundColor: theme.colors.backgroundVariant}}>
                    <div 
                        className="skill-progress-bar" 
                        style={{
                            width: `${(skillData.experience / skillData.experienceNeeded) * 100}%`,
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

export default SkillDetailPopup;