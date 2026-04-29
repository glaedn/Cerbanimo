import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import TokenAndSkillSummary from '../components/TokenAndSkillSummary';
// import FilterPanel from '../components/FilterPanel';
import ChronicleTimeline from '../components/ChronicleTimeline';
import { useIsMobile } from '../hooks/useIsMobile';
import './UserPortfolio.css';
import { Typography, Box } from '@mui/material';

const UserPortfolio = ({ userId: propUserId, accessToken }) => {
  const isMobile = useIsMobile();
  const routeParams = useParams();
  const userId = propUserId || routeParams.userId;

  const [chronicleData, setChronicleData] = useState([]);
  const [summaryData, setSummaryData] = useState({ total_tokens: 0, skills: [] });
  const [storyStats, setStoryStats] = useState({ total: 0, recent: 0 });

  useEffect(() => {
    if (!userId) return;

    const fetchData = async () => {
      try {
        const headers = accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {};
        // Fetch both chronicle entries and weekly wrap-up summaries
        const [chronicleRes, summariesRes] = await Promise.all([
          fetch(`${import.meta.env.VITE_BACKEND_URL}/storyChronicles/user/${userId}/chronicle`, { headers }),
          fetch(`${import.meta.env.VITE_BACKEND_URL}/story_engine_v2/summaries/user/${userId}?type=weekly%20wrap-up`, { headers })
        ]);

        if (chronicleRes.status === 401) {
            console.warn("Unauthorized to fetch chronicle data (Public view might be restricted)");
            setChronicleData([]);
            return;
        }

        const chronicleData = await chronicleRes.json();
        const summariesData = summariesRes.ok ? await summariesRes.json() : [];

        // Combine and sort by created_at desc
        const combinedData = [
          ...(Array.isArray(chronicleData) ? chronicleData : []),
          ...(Array.isArray(summariesData) ? summariesData : [])
        ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        if (combinedData.length === 0) {
          setChronicleData([]);
          setStoryStats({ total: 0, recent: 0 });
        } else {
          setChronicleData(combinedData);
          const recentCount = combinedData.filter(
            entry => new Date(entry.created_at) > Date.now() - 2592000000
          ).length;
          setStoryStats({
            total: combinedData.length,
            recent: recentCount
          });
        }

        const summaryRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/storyChronicles/user/${userId}/summary`);
        const summaryRaw = await summaryRes.json();

        // --- Start of transformation logic ---
        let processedSkills = [];
        const rawSkillsArray = Array.isArray(summaryRaw.skills) ? summaryRaw.skills : [];
        const tokensPerSkillArray = Array.isArray(summaryRaw.tokens_per_skill) ? summaryRaw.tokens_per_skill : [];

        if (rawSkillsArray.length > 0) {
          const tokensMap = new Map();
          tokensPerSkillArray.forEach(item => {
            if (item && typeof item.skill_name === 'string' && item.tokens !== undefined) {
              const tokenValue = parseInt(item.tokens, 10);
              if (!isNaN(tokenValue)) { // Ensure parsing was successful
                tokensMap.set(item.skill_name, tokenValue);
              } else {
                // Optional: handle or log cases where parsing fails, or set a default like 0
                tokensMap.set(item.skill_name, 0); // Default to 0 if parsing fails
              }
            }
          });

          processedSkills = rawSkillsArray.map(skillName => {
            // Ensure skillName is a string, though it should be based on typical API responses
            const currentSkillName = typeof skillName === 'string' ? skillName : String(skillName);
            return {
              id: currentSkillName, // Using skillName as ID, ensure it's unique or suitable for a key
              name: currentSkillName, // This will be used by TokenAndSkillSummary if skill_name is not present
              skill_name: currentSkillName, // Explicitly providing skill_name
              tokens: tokensMap.get(currentSkillName) || 0, // Default to 0 if not found
              // Add level and exp with defaults if TokenAndSkillSummary expects them,
              // otherwise, TokenAndSkillSummary needs to handle their absence.
              // For this task, only name and tokens are specified from this transformation.
              // TokenAndSkillSummary expects skill_level and skill_exp. Let's add defaults.
              skill_level: 0, // Default level
              skill_exp: 'N/A' // Default experience
            };
          });
        }
        // --- End of transformation logic ---

        const newSummaryData = {
          total_tokens: parseInt(summaryRaw.total_tokens, 10) || 0,
          skills: processedSkills // Use the transformed array here
        };
        setSummaryData(newSummaryData);
      } catch (err) {
        console.error("Error fetching chronicle or summary data:", err);
      }
    };

    fetchData();
  }, [userId]);

  if (!userId) {
    return <Typography color="error">No user specified</Typography>;
  }

  return (
    <Box className={`portfolio-page ${isMobile ? 'mobile-portfolio' : ''}`} sx={{ p: isMobile ? 2 : 3, pb: isMobile ? 10 : 3 }}>
      <Box className="header-row" mb={isMobile ? 2 : 4}>
        <Typography variant={isMobile ? "h5" : "h4"} color="primary" sx={{ fontFamily: 'Orbitron' }}>
          {isMobile ? 'RECORD_OF_IMPACT' : 'User Portfolio'}
        </Typography>
      </Box>

      <Box className="portfolio-section-summary" mb={isMobile ? 3 : 6}>
        <TokenAndSkillSummary
          tokens={summaryData.total_tokens}
          skills={summaryData.skills}
        />
      </Box>

      <Box className="portfolio-filters" mb={isMobile ? 2 : 4} sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 2 }}>
        {/* <FilterPanel filters={filters} setFilters={setFilters} /> */}
        <Box className="story-stats" sx={{ bgcolor: 'rgba(0, 243, 255, 0.05)', p: 2, borderRadius: 1, border: '1px solid rgba(0, 243, 255, 0.2)', width: isMobile ? '100%' : 'auto' }}>
          <Typography variant="caption" sx={{ color: '#888', display: 'block' }}>CHRONICLE STATS</Typography>
          <Typography variant="body1" sx={{ color: '#00f3ff', fontFamily: 'Orbitron' }}>
           TOTAL_STORIES: {storyStats.total}
          </Typography>
          <Typography variant="body1" sx={{ color: '#ff5ca2', fontFamily: 'Orbitron' }}>
            RECENT_30D: {storyStats.recent}
          </Typography>
        </Box>
      </Box>

      <Box className="portfolio-section-timeline">
        <Typography variant="h6" sx={{ color: '#00f3ff', fontFamily: 'Orbitron', mb: 2, fontSize: '1rem' }}>TIMELINE_FEED</Typography>
        <ChronicleTimeline stories={chronicleData} />
      </Box>
    </Box>
  );
};

export default UserPortfolio;
