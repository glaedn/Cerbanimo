import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box, Typography, Card, CardContent, Grid, Chip,
  Button, LinearProgress, CircularProgress
} from '@mui/material';
import { Shield, TrendingUp, PlusCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import './GuildsDashboard.css';

const GuildsDashboard = () => {
  const navigate = useNavigate();
  const { getAccessTokenSilently, user } = useAuth0();
  const [guilds, setGuilds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myMemberships, setMyMemberships] = useState([]);
  const [userProfile, setUserProfile] = useState(null);

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
    <Box className="guilds-dashboard-container">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={6}>
        <Typography variant="h3" className="guilds-title">GUILD INTELLIGENCE</Typography>
      </Box>

      {myMemberships.length > 0 && (
        <Box mb={6}>
          <Typography variant="h4" className="section-title">MY GUILD PROGRESSION</Typography>
          <Grid container spacing={4}>
            {myMemberships.map(membership => (
              <Grid item xs={12} sm={6} md={4} key={membership.guild_id}>
                <Card className="cyber-card membership-card">
                  <CardContent>
                    <Typography variant="h5" className="guild-name">{membership.guild_name}</Typography>
                    <Typography variant="caption" sx={{ color: '#00f3ff' }}>RANK: {membership.role} | XP: {membership.xp}</Typography>
                    <Button fullWidth className="cyber-button-guild" onClick={() => navigate(`/guilds/${membership.guild_id}`)}>ENTER HUB</Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      <Typography variant="h4" className="section-title">GUILD REGISTRY</Typography>
      <Grid container spacing={4}>
        {guilds.map(guild => {
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

                <Grid container spacing={1} mb={2}>
                    <Grid item xs={6}>
                        <Box sx={{ bgcolor: '#111', p: 1, borderRadius: 1, textAlign: 'center' }}>
                            <TrendingUp size={14} color="#00f3ff" />
                            <Typography sx={{ fontSize: '0.8rem' }}>{(Number(guild.intel?.task_demand || 0) * 100).toFixed(0)}%</Typography>
                            <Typography sx={{ fontSize: '0.6rem', color: '#666' }}>DEMAND</Typography>
                        </Box>
                    </Grid>
                    <Grid item xs={6}>
                        <Box sx={{ bgcolor: '#111', p: 1, borderRadius: 1, textAlign: 'center' }}>
                            <Shield size={14} color="#00f3ff" />
                            <Typography sx={{ fontSize: '0.8rem' }}>{(Number(guild.intel?.verification_pass_rate || 0) * 100).toFixed(0)}%</Typography>
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
    </Box>
  );
};

export default GuildsDashboard;
