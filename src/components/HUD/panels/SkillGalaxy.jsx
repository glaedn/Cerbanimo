import React from 'react';
import { useUserProfile } from '../../../hooks/useUserProfile'; // Adjust path
import useSkillData from '../../../hooks/useSkillData'; // Adjust path
import '../HUDPanel.css'; // Shared panel styles
import './SkillGalaxy.css'; // Specific styles for SkillGalaxy

const SkillGalaxy = () => {
  const { profile, loading: profileLoading, error: profileError } = useUserProfile();
  const { allSkills, loading: skillsLoading, error: skillsError } = useSkillData();

  if (profileLoading || skillsLoading) return <div className="hud-panel skill-galaxy">Loading Skill Galaxy...</div>;
  if (profileError) return <div className="hud-panel skill-galaxy">Error loading profile: {profileError.message}</div>;
  if (skillsError) return <div className="hud-panel skill-galaxy">Error loading skills: {skillsError.message}</div>;
  if (!profile) return <div className="hud-panel skill-galaxy">User profile not available.</div>;

  // Group skills by category
  const groupedSkills = allSkills.reduce((acc, skill) => {
    const category = skill.category || 'Uncategorized'; // Default category if none provided
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(skill);
    return acc;
  }, {});

  // Sort categories, then skills within categories by name for consistent display
  const sortedCategories = Object.keys(groupedSkills).sort();
  for (const category in groupedSkills) {
    groupedSkills[category].sort((a, b) => a.name.localeCompare(b.name));
  }
  
  const accentGreen = '#00D787'; // theme.colors.accentGreen

  return (
    <div className="hud-panel skill-galaxy">
      <div className="hud-panel-header">
        <h4>Skill Galaxy</h4>
      </div>
      {sortedCategories.length > 0 ? (
        sortedCategories.map(category => (
          <div key={category} className="skill-category">
            <h5 className="category-title">{category}</h5>
            <ul className="skill-list">
              {groupedSkills[category].map(skill => {
                const userSkillData = profile.skills.find(s => s.id === skill.id);
                const isUnlocked = !!userSkillData;
                const level = userSkillData ? userSkillData.level : 0;
                // const xp = userSkillData ? userSkillData.exp : 0; // If XP needs to be displayed

                return (
                  <li 
                    key={skill.id} 
                    className={`skill-node ${isUnlocked ? 'unlocked' : 'locked'}`}
                    title={skill.description || skill.name} // Show description on hover
                  >
                    <span className="skill-name">{skill.name}</span>
                    {isUnlocked && <span className="skill-level" style={{color: accentGreen}}> (Lvl {level})</span>}
                    {/* Placeholder for basic connector line - complex, skip for now */}
                    {/* {skill.parent_skill_id && <div className="skill-connector-line-placeholder"></div>} */}
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
  );
};
export default SkillGalaxy;
