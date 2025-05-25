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
        const chronicleRes = await fetch(`http://localhost:4000/storyChronicles/user/${userId}/chronicle`);
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

        const summaryRes = await fetch(`http://localhost:4000/storyChronicles/user/${userId}/summary`);
        const summaryRaw = await summaryRes.json();
        const summaryData = {
          total_tokens: parseInt(summaryRaw.total_tokens, 10) || 0,
          skills: summaryRaw.skills || []
        };
        setSummaryData(summaryData);
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

      <TokenAndSkillSummary
        tokens={summaryData.total_tokens}
        skills={summaryData.skills}
      />

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

      <ChronicleTimeline stories={chronicleData} />
    </div>
  );
};

export default UserPortfolio;
