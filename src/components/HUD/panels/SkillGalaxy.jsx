import React, { useState } from 'react';
import { useUserProfile } from '../../../hooks/useUserProfile'; // Adjust path
import useSkillData from '../../../hooks/useSkillData'; // Adjust path
import '../HUDPanel.css'; // Shared panel styles
import './SkillGalaxy.css'; // Specific styles for SkillGalaxy

const SkillGalaxy = () => {
  const { profile, loading: profileLoading, error: profileError } = useUserProfile();
  const { allSkills, loading: skillsLoading, error: skillsError } = useSkillData();
  const [isMinimized, setIsMinimized] = useState(false);

  const toggleMinimize = (e) => {
    if (e && e.currentTarget.tagName === 'BUTTON' && e.target.tagName === 'BUTTON') {
      e.stopPropagation();
    }
    setIsMinimized(!isMinimized);
  };

  if (profileLoading || skillsLoading) {
    return <div className="hud-panel skill-galaxy">Loading Skill Galaxy...</div>;
  }
  if (profileError) {
    return <div className="hud-panel skill-galaxy">Error loading profile: {profileError.message}</div>;
  }
  if (skillsError) {
    return <div className="hud-panel skill-galaxy">Error loading skills: {skillsError.message}</div>;
  }
  if (!profile) {
    return <div className="hud-panel skill-galaxy">User profile not available.</div>;
  }

  const groupedSkills = allSkills.reduce((acc, skill) => {
    const category = skill.category || 'Uncategorized';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(skill);
    return acc;
  }, {});

  const sortedCategories = Object.keys(groupedSkills).sort();
  for (const category in groupedSkills) {
    groupedSkills[category].sort((a, b) => a.name.localeCompare(b.name));
  }
  
  const accentGreen = '#00D787'; // theme.colors.accentGreen

  return (
    <div className={`hud-panel skill-galaxy ${isMinimized ? 'minimized' : ''}`}>
      <div className="hud-panel-header" onClick={toggleMinimize} title={isMinimized ? "Expand Panel" : "Minimize Panel"}>
        <h4>Skill Galaxy</h4>
        <button onClick={toggleMinimize} className="minimize-btn" aria-label={isMinimized ? "Expand Skill Galaxy" : "Minimize Skill Galaxy"}>
          {isMinimized ? '+' : '-'}
        </button>
      </div>
      {!isMinimized && (
        <div className="hud-panel-content">
          {sortedCategories.length > 0 ? (
            sortedCategories.map(category => (
              <div key={category} className="skill-category">
                <h5 className="category-title">{category}</h5>
                <ul className="skill-list">
                  {groupedSkills[category].map(skill => {
                    const userSkillData = profile.skills.find(s => s.id === skill.id);
                    const isUnlocked = !!userSkillData;
                    const level = userSkillData ? userSkillData.level : 0;

                    return (
                      <li 
                        key={skill.id} 
                        className={`skill-node ${isUnlocked ? 'unlocked' : 'locked'}`}
                        title={skill.description || skill.name}
                      >
                        <span className="skill-name">{skill.name}</span>
                        {isUnlocked && <span className="skill-level" style={{color: accentGreen}}> (Lvl {level})</span>}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          ) : (
            <p>No skills data available to display in the galaxy.</p>
          )}
        </div>
      )}
    </div>
  );
};
export default SkillGalaxy;
