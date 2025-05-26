import React from 'react';
import './SkillDetailPopup.css';
import theme from '../../../styles/theme'; // Adjust path as necessary

const SkillDetailPopup = ({ skillData, onClose }) => {
  if (!skillData) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="skill-detail-popup-overlay" onClick={handleOverlayClick}>
      <div className="skill-detail-popup-content" style={{ backgroundColor: theme.colors.backgroundPaper, color: theme.colors.textPrimary }}>
        <button className="skill-detail-popup-close" onClick={onClose} style={{ color: theme.colors.textPrimary }}>&times;</button>
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
};

export default SkillDetailPopup;
