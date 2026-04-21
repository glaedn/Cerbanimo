import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box, Typography, Card, CardContent, Grid, Chip,
  Button, LinearProgress, CircularProgress, Pagination
} from '@mui/material';
import { Shield, TrendingUp, PlusCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { useIsMobile } from '../hooks/useIsMobile';
import './GuildsDashboard.css';

const GuildsDashboard = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { getAccessTokenSilently, user } = useAuth0();
  const [guilds, setGuilds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myMemberships, setMyMemberships] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  const rankThresholds = {
    'Apprentice': { next: 'Specialist', xp: 1000 },
    'Specialist': { next: 'Architect', xp: 3000 },
    'Architect': { next: 'Mentor', xp: 6000 },
    'Mentor': { next: 'Master', xp: 10000 },
    'Master': { next: null, xp: 0 }
  };

  const getRankProgress = (role, xp) => {
    const current = rankThresholds[role];
    if (!current || !current.next) return 100;
    const prevXP = Object.values(rankThresholds).find(v => v.next === role)?.xp || 0;
    const progress = ((xp - prevXP) / (current.xp - prevXP)) * 100;
    return Math.min(Math.max(progress, 5), 100);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = await getAccessTokenSilently();

        const profileRes = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/profile`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const profileData = profileRes.data;
        setUserProfile(profileData);

        const guildsRes = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/guilds_v2`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const guildsWithIntel = guildsRes.data || [];

        const membershipsRes = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/guilds_v2/my-memberships/${profileData.id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const myMembershipsData = membershipsRes.data || [];
        setMyMemberships(myMembershipsData);

        const userSelectedSkills = profileData.skills || [];

        const sortedGuilds = [...guildsWithIntel].sort((a, b) => {
            const aIsMember = myMembershipsData.some(m => m.guild_id === a.id);
            const bIsMember = myMembershipsData.some(m => m.guild_id === b.id);
            if (aIsMember && !bIsMember) return -1;
            if (!aIsMember && bIsMember) return 1;

            const aIsSelected = userSelectedSkills.includes(a.skill_name);
            const bIsSelected = userSelectedSkills.includes(b.skill_name);
            if (aIsSelected && !bIsSelected) return -1;
            if (!aIsSelected && bIsSelected) return 1;

            return Number(b.intel?.submitted_tasks_count || 0) - Number(a.intel?.submitted_tasks_count || 0);
        });

        setGuilds(sortedGuilds);
        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch guild data:", err);
        setLoading(false);
      }
    };
    if (user) fetchData();
  }, [getAccessTokenSilently, user]);

  if (loading) return <Box p={4} sx={{ backgroundColor: '#0a0a0a', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><CircularProgress sx={{ color: '#00f3ff' }} /></Box>;

  return (
    <Box className={`guilds-dashboard-container ${isMobile ? 'mobile-container' : ''}`} sx={{ pb: isMobile ? 12 : 2 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={isMobile ? 2 : 6}>
        <Typography variant={isMobile ? "h5" : "h3"} className="guilds-title" sx={{ fontFamily: 'Orbitron', color: '#00f3ff' }}>GUILD INTELLIGENCE</Typography>
      </Box>

      {myMemberships.length > 0 && (
        <Box mb={isMobile ? 4 : 6}>
          <Typography variant={isMobile ? "h6" : "h4"} className="section-title" sx={{ fontFamily: 'Orbitron', mb: 2 }}>MY GUILD PROGRESSION</Typography>
          <Grid container spacing={isMobile ? 2 : 4}>
            {myMemberships.map(membership => (
              <Grid item xs={12} sm={6} md={4} key={membership.guild_id}>
                <Card className="cyber-card membership-card">
                  <CardContent>
                    <Typography variant="h5" className="guild-name">{membership.guild_name}</Typography>
                    <Box sx={{ mt: 1, mb: 2 }}>
                        <Box display="flex" justifyContent="space-between" mb={0.5}>
                            <Typography variant="caption" sx={{ color: '#ff5ca2', fontFamily: 'Orbitron' }}>{membership.role}</Typography>
                            <Typography variant="caption" sx={{ color: '#00f3ff' }}>XP: {membership.xp} / {rankThresholds[membership.role]?.xp || 'MAX'}</Typography>
                        </Box>
                        <LinearProgress
                            variant="determinate"
                            value={getRankProgress(membership.role, membership.xp)}
                            className="xp-progress-bar"
                        />
                    </Box>
                    <Button fullWidth className="cyber-button-guild" onClick={() => navigate(`/guilds/${membership.guild_id}`)}>ENTER HUB</Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      <Typography variant={isMobile ? "h6" : "h4"} className="section-title" sx={{ fontFamily: 'Orbitron', mb: 2 }}>GUILD REGISTRY</Typography>
      <Grid container spacing={isMobile ? 2 : 4}>
        {guilds.slice((page - 1) * itemsPerPage, page * itemsPerPage).map(guild => {
          const isSelected = userProfile?.skills?.includes(guild.skill_name);
          const isMember = myMemberships.some(m => m.guild_id === guild.id);
          const highlightClass = isSelected ? 'selected-skill' : (isMember ? 'active-contribution' : '');

          return (
          <Grid item xs={12} sm={6} md={4} key={guild.id}>
            <Card className={`cyber-card ${highlightClass}`}>
              <CardContent>
                <Typography variant="h5" className="guild-name">{guild.name}</Typography>
                <Typography variant="body2" color="gray" sx={{ mb: 2 }}>{guild.description}</Typography>

                <Box mb={2}>
                    <Box display="flex" justifyContent="space-between" mb={0.5}>
                        <Typography variant="caption" sx={{ color: '#888' }}>GUILD HEALTH</Typography>
                        <Typography variant="caption" sx={{ color: '#00f3ff' }}>{(Number(guild.intel?.health_score || 0) * 100).toFixed(0)}%</Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={Number(guild.intel?.health_score || 0) * 100} className="health-bar" />
                </Box>

                <Grid container spacing={isMobile ? 1 : 1} mb={2}>
                    <Grid item xs={6}>
                        <Box sx={{ bgcolor: 'rgba(0, 243, 255, 0.05)', p: 1, borderRadius: 1, textAlign: 'center', border: '1px solid rgba(0, 243, 255, 0.1)' }}>
                            <TrendingUp size={isMobile ? 12 : 14} color="#00f3ff" />
                            <Typography sx={{ fontSize: isMobile ? '0.7rem' : '0.8rem' }}>{(Number(guild.intel?.task_demand || 0) * 100).toFixed(0)}%</Typography>
                            <Typography sx={{ fontSize: '0.6rem', color: '#666' }}>DEMAND</Typography>
                        </Box>
                    </Grid>
                    <Grid item xs={6}>
                        <Box sx={{ bgcolor: 'rgba(0, 243, 255, 0.05)', p: 1, borderRadius: 1, textAlign: 'center', border: '1px solid rgba(0, 243, 255, 0.1)' }}>
                            <Shield size={isMobile ? 12 : 14} color="#00f3ff" />
                            <Typography sx={{ fontSize: isMobile ? '0.7rem' : '0.8rem' }}>{(Number(guild.intel?.verification_pass_rate || 0) * 100).toFixed(0)}%</Typography>
                            <Typography sx={{ fontSize: '0.6rem', color: '#666' }}>VERIFIED</Typography>
                        </Box>
                    </Grid>
                </Grid>

                <Button fullWidth className="cyber-button-guild" onClick={() => navigate(`/guilds/${guild.id}`)}>ENTER HUB</Button>
              </CardContent>
            </Card>
          </Grid>
          );
        })}
      </Grid>

      {guilds.length > itemsPerPage && (
        <Box display="flex" justifyContent="center" mt={6} className="pagination-container">
          <Pagination
            count={Math.ceil(guilds.length / itemsPerPage)}
            page={page}
            onChange={(e, v) => {
                setPage(v);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            color="primary"
            sx={{
                '& .MuiPaginationItem-root': {
                    color: '#00f3ff',
                    borderColor: 'rgba(0, 243, 255, 0.3)',
                    fontFamily: 'Orbitron',
                    '&:hover': {
                        backgroundColor: 'rgba(0, 243, 255, 0.1)',
                    },
                    '&.Mui-selected': {
                        backgroundColor: 'rgba(0, 243, 255, 0.2)',
                        textShadow: '0 0 8px #00f3ff',
                        borderColor: '#00f3ff',
                    }
                }
            }}
          />
        </Box>
      )}
    </Box>
  );
};

export default GuildsDashboard;
