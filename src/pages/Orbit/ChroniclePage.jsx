import React, { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import axios from 'axios';
import { useUserProfile } from '../../hooks/useUserProfile';
import { useAuth0 } from '@auth0/auth0-react';
import ChronicleTimeline from '../../components/ChronicleTimeline';
import TokenAndSkillSummary from '../../components/TokenAndSkillSummary';
import './ChroniclePage.css';

const ChroniclePage = () => {
  const { profile, loading: profileLoading } = useUserProfile();
  const { getAccessTokenSilently } = useAuth0();
  const [chronicleData, setChronicleData] = useState([]);
  const [summaryData, setSummaryData] = useState({ total_tokens: 0, skills: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const token = await getAccessTokenSilently();
        const headers = { 'Authorization': `Bearer ${token}` };

        // Fetch both chronicle entries and weekly wrap-up summaries
        const [chronicleRes, summariesRes] = await Promise.all([
          axios.get(`${import.meta.env.VITE_BACKEND_URL}/storyChronicles/user/${profile.id}/chronicle`, { headers }),
          axios.get(`${import.meta.env.VITE_BACKEND_URL}/story_engine_v2/summaries/user/${profile.id}?type=weekly%20wrap-up`, { headers })
            .catch(() => ({ data: [] }))
        ]);

        const chronicleData = chronicleRes.data;
        const summariesData = summariesRes.data;

        // Combine and sort by created_at desc
        const combinedData = [
          ...(Array.isArray(chronicleData) ? chronicleData : []),
          ...(Array.isArray(summariesData) ? summariesData : [])
        ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        setChronicleData(combinedData);

        const summaryRes = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/storyChronicles/user/${profile.id}/summary`, { headers });
        const summaryRaw = summaryRes.data;

        // Transformation logic matching UserPortfolio.jsx
        let processedSkills = [];
        const rawSkillsArray = Array.isArray(summaryRaw.skills) ? summaryRaw.skills : [];
        const tokensPerSkillArray = Array.isArray(summaryRaw.tokens_per_skill) ? summaryRaw.tokens_per_skill : [];

        if (rawSkillsArray.length > 0) {
          const tokensMap = new Map();
          tokensPerSkillArray.forEach(item => {
            if (item && typeof item.skill_name === 'string' && item.tokens !== undefined) {
              tokensMap.set(item.skill_name, parseInt(item.tokens, 10) || 0);
            }
          });

          processedSkills = rawSkillsArray.map(skillName => ({
            id: skillName,
            name: skillName,
            skill_name: skillName,
            tokens: tokensMap.get(skillName) || 0,
            skill_level: 0,
            skill_exp: 'N/A'
          }));
        }

        setSummaryData({
          total_tokens: parseInt(summaryRaw.total_tokens, 10) || 0,
          skills: processedSkills
        });
      } catch (err) {
        console.error("Error fetching chronicle data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [profile?.id, getAccessTokenSilently]);

  if (profileLoading || loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="50vh">
        <CircularProgress sx={{ color: '#00f3ff' }} />
      </Box>
    );
  }

  return (
    <Box className="chronicle-page-content glass-panel">
      <div className="chronicle-header">
        <span className="orbit-kicker">HISTORY_LOG</span>
        <Typography variant="h4" className="orbitron-text glow-text">CERBANIMO_CHRONICLE</Typography>
      </div>

      <Box mb={4}>
        <TokenAndSkillSummary
          tokens={summaryData.total_tokens}
          skills={summaryData.skills}
        />
      </Box>

      <Box className="chronicle-timeline-container">
        <Typography variant="h6" className="section-subtitle">TIMELINE_FEED</Typography>
        <ChronicleTimeline stories={chronicleData} />
      </Box>
    </Box>
  );
};

export default ChroniclePage;
