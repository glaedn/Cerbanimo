import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import TokenAndSkillSummary from '../components/TokenAndSkillSummary';
// import FilterPanel from '../components/FilterPanel';
import ChronicleTimeline from '../components/ChronicleTimeline';
import './UserPortfolio.css';
import { Typography } from '@mui/material';

const UserPortfolio = ({ userId: propUserId }) => {
  const routeParams = useParams();
  const userId = propUserId || routeParams.userId;

  const [chronicleData, setChronicleData] = useState([]);
  const [summaryData, setSummaryData] = useState({ total_tokens: 0, skills: [] });
  const [storyStats, setStoryStats] = useState({ total: 0, recent: 0 });

  useEffect(() => {
    if (!userId) return;

    const fetchData = async () => {
      try {
        const chronicleRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/storyChronicles/user/${userId}/chronicle`);
        const chronicleData = await chronicleRes.json();

        if (!Array.isArray(chronicleData)) {
          console.error("Expected chronicle data to be an array:", chronicleData);
          setChronicleData([]);
          setStoryStats({ total: 0, recent: 0 });
        } else {
          setChronicleData(chronicleData);
          const recentCount = chronicleData.filter(
            entry => new Date(entry.created_at) > Date.now() - 2592000000
          ).length;
          setStoryStats({
            total: chronicleData.length,
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
    <div className="portfolio-page">
      <div className="header-row">
        <Typography variant="h4" color="primary">User Portfolio</Typography>
      </div>

      <div className="portfolio-section-summary">
        <TokenAndSkillSummary
          tokens={summaryData.total_tokens}
          skills={summaryData.skills}
        />
      </div>

      <div className="portfolio-filters">
        {/* <FilterPanel filters={filters} setFilters={setFilters} /> */}
        <div className="story-stats">
          <Typography variant="body1" color="secondary">
           Total Stories: {storyStats.total}
          </Typography>
          <Typography variant="body1" color="secondary">
            Recent (30d): {storyStats.recent}
          </Typography>
        </div>
      </div>

      <div className="portfolio-section-timeline">
        <ChronicleTimeline stories={chronicleData} />
      </div>
    </div>
  );
};

export default UserPortfolio;
