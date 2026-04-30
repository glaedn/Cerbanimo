import React, { useState, useEffect } from 'react';
import { Box, Typography, IconButton, Button, CircularProgress } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';
import theme from '../styles/theme';
import './SkillLibrary.css';
import { toast } from 'react-hot-toast';

const SkillLibrary = () => {
  const navigate = useNavigate();
  const { getAccessTokenSilently } = useAuth0();
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [expandedSkills, setExpandedSkills] = useState(new Set());
  const [unlockedSkills, setUnlockedSkills] = useState(new Set());
  const [initialUnlockedSkills, setInitialUnlockedSkills] = useState(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSkills();
    fetchUserId();
  }, []);

  const fetchUserId = async () => {
    try {
      const token = await getAccessTokenSilently();
      const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUserId(response.data.id);
    } catch (err) {
      console.error('Error fetching user ID:', err);
    }
  };

  const fetchSkills = async () => {
    try {
      const token = await getAccessTokenSilently();
      const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/skills/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSkills(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching skills:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId && skills.length > 0) {
      const unlocked = new Set();
      skills.forEach(skill => {
        const users = skill.unlocked_users || [];
        const isUnlocked = users.some(u => {
            const uId = typeof u === 'string' ? JSON.parse(u).user_id : u.user_id;
            return uId === userId;
        });
        if (isUnlocked) unlocked.add(skill.id);
      });
      setUnlockedSkills(unlocked);
      setInitialUnlockedSkills(new Set(unlocked));
    }
  }, [userId, skills]);

  const toggleExpand = (skillId) => {
    const newExpanded = new Set(expandedSkills);
    if (newExpanded.has(skillId)) {
      newExpanded.delete(skillId);
    } else {
      newExpanded.add(skillId);
    }
    setExpandedSkills(newExpanded);
  };

  const toggleUnlock = (skillId) => {
    const newUnlocked = new Set(unlockedSkills);
    if (newUnlocked.has(skillId)) {
      newUnlocked.delete(skillId);
    } else {
      newUnlocked.add(skillId);
    }
    setUnlockedSkills(newUnlocked);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = await getAccessTokenSilently();
      const skillChanges = [];

      // Determine what changed
      unlockedSkills.forEach(id => {
        if (!initialUnlockedSkills.has(id)) {
          const skill = skills.find(s => s.id === id);
          skillChanges.push({ skillId: id, skillName: skill?.name, action: 'unlock' });
        }
      });
      initialUnlockedSkills.forEach(id => {
        if (!unlockedSkills.has(id)) {
          skillChanges.push({ skillId: id, action: 'lock' });
        }
      });

      if (skillChanges.length === 0) {
        setSaving(false);
        return;
      }

      const updatedSkillsForProfile = Array.from(unlockedSkills).map(id => {
        const skill = skills.find(s => s.id === id);
        return { id, name: skill?.name };
      });

      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/skills/bulk-unlock`, {
        skillChanges,
        fullSkills: updatedSkillsForProfile
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setInitialUnlockedSkills(new Set(unlockedSkills));
      toast.success('Skills updated successfully');
    } catch (err) {
      console.error('Error saving skill changes:', err);
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = () => {
    if (unlockedSkills.size !== initialUnlockedSkills.size) return true;
    for (let id of unlockedSkills) {
      if (!initialUnlockedSkills.has(id)) return true;
    }
    return false;
  };

  const renderSkillCard = (skill, level = 0) => {
    const isUnlocked = unlockedSkills.has(skill.id);
    const children = skills.filter(s => s.parent_skill_id === skill.id && s.id !== s.parent_skill_id);
    const isExpanded = expandedSkills.has(skill.id);

    return (
      <Box key={skill.id} sx={{
        width: level === 0
          ? { xs: '100%', sm: 'calc(50% - 8px)', md: 'calc(33.33% - 11px)' }
          : '100%',
        mb: level > 0 ? 1 : 0
      }}>
        <Box
          className={`skill-card ${isUnlocked ? 'selected' : ''}`}
          onClick={() => {
            if (children.length > 0) {
              toggleExpand(skill.id);
            } else {
              toggleUnlock(skill.id);
            }
          }}
          sx={{
            p: 2,
            borderRadius: '12px',
            border: `1px solid ${isUnlocked ? theme.colors.secondary : 'rgba(255, 92, 162, 0.1)'}`,
            cursor: 'pointer',
            backgroundColor: isUnlocked ? 'rgba(255, 92, 162, 0.1)' : 'rgba(255, 255, 255, 0.03)',
            color: isUnlocked ? theme.colors.secondary : '#FFF',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: isUnlocked ? `0 0 20px ${theme.colors.secondary}33` : 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '2px',
              background: isUnlocked ? `linear-gradient(90deg, transparent, ${theme.colors.secondary}, transparent)` : 'transparent',
            },
            '&:hover': {
              backgroundColor: isUnlocked ? 'rgba(255, 92, 162, 0.15)' : 'rgba(255, 255, 255, 0.07)',
              transform: 'translateY(-2px)',
              boxShadow: isUnlocked ? `0 5px 25px ${theme.colors.secondary}44` : `0 5px 15px rgba(0,0,0,0.3)`,
              borderColor: isUnlocked ? theme.colors.secondary : 'rgba(255, 92, 162, 0.3)',
            }
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Typography variant="body1" sx={{ fontFamily: 'Orbitron', fontWeight: 600, letterSpacing: '1px' }}>
              {skill.name}
            </Typography>
            {children.length > 0 && (
              isExpanded ? <ExpandLessIcon sx={{ color: isUnlocked ? theme.colors.secondary : 'rgba(255,255,255,0.5)' }} /> : <ExpandMoreIcon sx={{ color: isUnlocked ? theme.colors.secondary : 'rgba(255,255,255,0.5)' }} />
            )}
          </Box>
          {skill.description && (
            <Typography variant="body2" sx={{
              color: isUnlocked ? 'rgba(255,255,255,0.9)' : 'rgba(255, 255, 255, 0.5)',
              fontSize: '0.85rem',
              lineHeight: 1.4,
              fontFamily: 'Inter'
            }}>
              {skill.description}
            </Typography>
          )}
        </Box>
        {isExpanded && children.length > 0 && (
          <Box sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 2,
            mt: 2,
            mb: 2,
            ml: 1,
            pl: 2,
            borderLeft: `2px solid ${theme.colors.secondary}33`,
            width: 'calc(100% - 8px)'
          }}>
            {children.map(child => renderSkillCard(child, level + 1))}
          </Box>
        )}
      </Box>
    );
  };

  const topLevelSkills = skills.filter(s => !s.parent_skill_id || s.parent_skill_id === s.id);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', bgcolor: '#0A0A2E' }}>
        <CircularProgress sx={{ color: theme.colors.secondary }} />
      </Box>
    );
  }

  return (
    <Box className="skill-library-container">
      <Box className="skill-library-header">
        <IconButton onClick={() => navigate(-1)} sx={{ color: theme.colors.secondary }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" sx={{ fontFamily: 'Orbitron', color: theme.colors.secondary, textShadow: `0 0 10px ${theme.colors.secondary}` }}>
          SKILL LIBRARY
        </Typography>
      </Box>

      <Box className="skill-library-content">
        {topLevelSkills.map((skill) => {
          const isExpanded = expandedSkills.has(skill.id);
          const children = skills.filter(s => s.parent_skill_id === skill.id && s.id !== skill.id);

          return (
            <Box key={skill.id} sx={{ mb: 3 }}>
              <Box
                className="skill-category-header"
                onClick={() => toggleExpand(skill.id)}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  p: 2,
                  backgroundColor: 'rgba(255, 92, 162, 0.1)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  border: `1px solid ${theme.colors.secondary}33`,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 92, 162, 0.15)',
                    boxShadow: `0 0 15px ${theme.colors.secondary}22`
                  }
                }}
              >
                <Box>
                  <Typography variant="h6" sx={{ fontFamily: 'Orbitron', color: theme.colors.secondary }}>
                    {skill.name}
                  </Typography>
                  {skill.description && (
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)', display: 'block', mt: 0.5 }}>
                      {skill.description}
                    </Typography>
                  )}
                </Box>
                {isExpanded ? <ExpandLessIcon sx={{ color: theme.colors.secondary }} /> : <ExpandMoreIcon sx={{ color: theme.colors.secondary }} />}
              </Box>

              {isExpanded && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2, p: 1 }}>
                  {children.map(child => renderSkillCard(child, 0))}
                </Box>
              )}
            </Box>
          );
        })}
      </Box>

      {hasChanges() && (
        <Box className="save-changes-container">
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            sx={{
              backgroundColor: theme.colors.secondary,
              color: '#FFF',
              fontFamily: 'Orbitron',
              '&:hover': {
                backgroundColor: theme.colors.secondary,
                boxShadow: `0 0 15px ${theme.colors.secondary}`,
              }
            }}
          >
            {saving ? <CircularProgress size={24} sx={{ color: '#FFF' }} /> : 'SAVE CHANGES'}
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default SkillLibrary;
