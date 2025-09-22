import React, { useState } from 'react';
import { useUserProfile } from '../../../hooks/useUserProfile';
import useUserIntentions from '../../../hooks/useUserIntentions.js';
import { useTheme } from '@mui/material/styles';
import {
  PanelContainer,
  PanelHeader,
  PanelTitle,
  PanelContent,
  ShrineImage,
  ActiveShrineImage,
} from './TheInnerSanctum.styles';
import InnerSanctumIcon from '../../../assets/magical-girl/The-Inner-Sanctum.png';
import InnerSanctumActiveIcon from '../../../assets/magical-girl/The-Inner-Sanctum-Active.png';

const TheInnerSanctum = () => {
  const { profile, loading: profileLoading, error: profileError } = useUserProfile();
  const { intentions, loading: intentionsLoading, error: intentionsError } = useUserIntentions(profile?.id);
  const [isExpanded, setIsExpanded] = useState(false);
  const theme = useTheme();

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  if (profileLoading || intentionsLoading) {
    return <PanelContainer>Loading Intentions...</PanelContainer>;
  }

  if (profileError || intentionsError) {
    return <PanelContainer>Error loading data.</PanelContainer>;
  }

  return (
    <PanelContainer onClick={toggleExpand} isExpanded={isExpanded}>
      <ShrineImage src={InnerSanctumIcon} alt="The Inner Sanctum" isExpanded={isExpanded} />
      {isExpanded && (
        <>
          <ActiveShrineImage src={InnerSanctumActiveIcon} alt="The Inner Sanctum Active" />
          <PanelContent>
            <PanelHeader>
              <PanelTitle>The Inner Sanctum</PanelTitle>
            </PanelHeader>
            {intentions.length > 0 ? (
              <ul>
                {intentions.map(intention => (
                  <li key={intention.id}>
                    <a href={`/visualizer/${intention.id}`}>{intention.name}</a>
                    <p>Quests: {intention.questCount} | Active: {intention.activeQuests}</p>
                    <p>Progress: {intention.progress}%</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No intentions currently being manifested.</p>
            )}
            <button>{theme.terminology?.open_project}</button>
          </PanelContent>
        </>
      )}
    </PanelContainer>
  );
};

export default TheInnerSanctum;
