import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import TokenAndAffinitySummary from '../components/TokenAndAffinitySummary';
import ChronicleTimeline from '../components/ChronicleTimeline';
import './UserGrimoire.css';
import { Typography } from '@mui/material';
import theme from '../styles/theme';

const UserGrimoire = ({ userId: propUserId }) => {
  const routeParams = useParams();
  const userId = propUserId || routeParams.userId;

  const [chronicleData, setChronicleData] = useState([]);
  const [summaryData, setSummaryData] = useState({ total_tokens: 0, affinities: [] });
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

        let processedAffinities = [];
        const rawAffinitiesArray = Array.isArray(summaryRaw.skills) ? summaryRaw.skills : [];
        const tokensPerAffinityArray = Array.isArray(summaryRaw.tokens_per_skill) ? summaryRaw.tokens_per_skill : [];

        if (rawAffinitiesArray.length > 0) {
          const tokensMap = new Map();
          tokensPerAffinityArray.forEach(item => {
            if (item && typeof item.affinity_name === 'string' && item.tokens !== undefined) {
              const tokenValue = parseInt(item.tokens, 10);
              if (!isNaN(tokenValue)) {
                tokensMap.set(item.affinity_name, tokenValue);
              } else {
                tokensMap.set(item.affinity_name, 0);
              }
            }
          });

          processedAffinities = rawAffinitiesArray.map(affinityName => {
            const currentAffinityName = typeof affinityName === 'string' ? affinityName : String(affinityName);
            return {
              id: currentAffinityName,
              name: currentAffinityName,
              affinity_name: currentAffinityName,
              tokens: tokensMap.get(currentAffinityName) || 0,
              affinity_level: 0,
              affinity_exp: 'N/A'
            };
          });
        }

        const newSummaryData = {
          total_tokens: parseInt(summaryRaw.total_tokens, 10) || 0,
          affinities: processedAffinities
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
        <Typography variant="h4" color="primary">{`${theme.terminology.portfolio} of User`}</Typography>
      </div>

      <div className="portfolio-section-summary">
        <TokenAndAffinitySummary
          tokens={summaryData.total_tokens}
          affinities={summaryData.affinities}
        />
      </div>

      <div className="portfolio-filters">
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

export default UserGrimoire;
