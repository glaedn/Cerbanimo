import React, { useState, useEffect, useCallback } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Box, Typography, Avatar } from '@mui/material';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './ProfilePage.css';
import UserPortfolio from '../UserPortfolio.jsx';
import CapabilitiesConstellation from '../../components/CapabilitiesConstellation';
import { useUserProfile } from '../../hooks/useUserProfile';
import useCapabilityData from '../../hooks/useCapabilityData';
import LevelNotification from '../../components/LevelNotification/LevelNotification';

const getTitleForLevel = (level) => {
  if (level >= 50) return "Cosmic Weaver";
  if (level >= 40) return "Star Forger";
  if (level >= 30) return "Celestial Navigator";
  if (level >= 20) return "Galaxy Wanderer";
  if (level >= 10) return "Vision Weaver";
  return "Dream Spark";
};

const ProfilePage = () => {
  const { user, isLoading } = useAuth0();
  const navigate = useNavigate();
  const { profile } = useUserProfile();
  const { allCapabilities } = useCapabilityData();

  const [userLevel, setUserLevel] = useState(1);
  const [userTitle, setUserTitle] = useState("Dream Spark");
  const [xpPercentage, setXpPercentage] = useState(0);
  const [isEditMode, setIsEditMode] = useState(false);
  const [notificationProps, setNotificationProps] = useState(null);

  useEffect(() => {
    if (profile && allCapabilities) {
      let totalGlobalExp = 0;
      let lastGainedSkill = null;
      let xpGained = 0;

      allCapabilities.forEach(capability => {
        if (capability.unlocked_users && Array.isArray(capability.unlocked_users)) {
          capability.unlocked_users.forEach(userEntry => {
            if (userEntry && userEntry.user_id === profile.id) {
              const experienceValue = userEntry.experience !== undefined ? userEntry.experience : userEntry.exp;
              if (typeof experienceValue === 'number') {
                totalGlobalExp += experienceValue;
              }
            }
          });
        }
      });
      
      const level = Math.floor(Math.sqrt(totalGlobalExp / 40)) + 1;
      const currentLevelExp = 40 * (level - 1) ** 2;
      const nextLevelExp = 40 * level ** 2;
      const expIntoCurrentLevel = totalGlobalExp - currentLevelExp;
      const expForNextLevel = nextLevelExp - currentLevelExp;

      if (userLevel !== 1 && level > userLevel) {
        setNotificationProps({
          previousXP: totalGlobalExp - 10, // This is an assumption
          newXP: totalGlobalExp,
          previousLevel: userLevel,
          newLevel: level,
          skillName: "General" // This is a placeholder
        });
      }

      setUserLevel(level);
      setUserTitle(getTitleForLevel(level));
      setXpPercentage(expForNextLevel > 0 ? (expIntoCurrentLevel / expForNextLevel) * 100 : 0);
    }
  }, [profile, allCapabilities, userLevel]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Box className="profile-container">
      {notificationProps && <LevelNotification {...notificationProps} />}
      <Typography className="profile-title" variant="h4" gutterBottom>
        ✧ YOUR CHRONICLE ✧
      </Typography>

      <Box className="profile-card">
        <Avatar
          alt={profile?.username || user?.name}
          src={profile?.profile_picture || user?.picture}
          className="profile-avatar"
        />
        <Box className="user-info">
          <Typography variant="h5">{profile?.username || user?.name}</Typography>
          <Typography variant="h6">[ Level {userLevel} — {userTitle} ]</Typography>
          <Box className="xp-bar-container">
            <Box className="xp-bar" style={{ width: `${xpPercentage}%` }}></Box>
          </Box>
          <Typography variant="body2" className="xp-text">XP: {Math.floor(xpPercentage)}%</Typography>
        </Box>
      </Box>

      <Box className="capabilities-panel">
        <Typography variant="h6" className="panel-title">Capabilities Constellation</Typography>
        {profile && <CapabilitiesConstellation capabilities={profile.skills || []} />}
      </Box>

      <Box className="timeline-panel">
        <Typography variant="h6" className="panel-title">Timeline</Typography>
        {profile && <UserPortfolio userId={profile.id} />}
      </Box>
      
      <Box className="action-buttons">
        <button className="control-button" onClick={() => setIsEditMode(!isEditMode)}>
          [ {isEditMode ? "SAVE CHANGES" : "EDIT CHRONICLE"} ]
        </button>
        <button className="control-button">[ SHARE ]</button>
      </Box>
    </Box>
  );
};

export default ProfilePage;
