import React, { useState, useEffect } from 'react';
import { Box, Typography, IconButton, Button, CircularProgress } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
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
      const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/profile/userId`, {
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
          skillChanges.push({ skillId: id, action: 'unlock' });
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

      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/skills/bulk-unlock`, {
        userId,
        skillChanges
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

  const renderSkill = (skill, level = 0) => {
    const children = skills.filter(s => s.parent_skill_id === skill.id && s.id !== s.parent_skill_id);
    const isExpanded = expandedSkills.has(skill.id);
    const isUnlocked = unlockedSkills.has(skill.id);

    return (
      <Box key={skill.id} sx={{ ml: level * 2, mb: 1 }}>
        <Box
          className={`skill-item ${isUnlocked ? 'unlocked' : ''}`}
          onClick={() => {
            if (children.length > 0) {
              toggleExpand(skill.id);
            } else {
              toggleUnlock(skill.id);
            }
          }}
          sx={{
            p: 1.5,
            border: `1px solid ${isUnlocked ? theme.colors.secondary : 'rgba(255, 255, 255, 0.1)'}`,
            borderRadius: '8px',
            cursor: 'pointer',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            },
            transition: 'all 0.2s ease-in-out',
            boxShadow: isUnlocked ? `0 0 10px ${theme.colors.secondary}4D` : 'none',
          }}
        >
          <Typography variant="body1" sx={{ fontFamily: 'Orbitron', color: isUnlocked ? theme.colors.secondary : '#FFF' }}>
            {skill.name}
          </Typography>
          {skill.description && (
            <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'rgba(255, 255, 255, 0.6)', mt: 0.5 }}>
              {skill.description}
            </Typography>
          )}
        </Box>
        {isExpanded && children.length > 0 && (
          <Box sx={{ mt: 1 }}>
            {children.map(child => renderSkill(child, level + 1))}
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
        <IconButton onClick={() => navigate('/profile')} sx={{ color: theme.colors.secondary }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" sx={{ fontFamily: 'Orbitron', color: theme.colors.secondary, textShadow: `0 0 10px ${theme.colors.secondary}` }}>
          SKILL LIBRARY
        </Typography>
      </Box>

      <Box className="skill-library-content">
        {topLevelSkills.map(skill => renderSkill(skill))}
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
