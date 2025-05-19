// UserPortfolio.jsx
import React, { useEffect, useState } from 'react';
import TokenAndSkillSummary from '../components/TokenAndSkillSummary';
import FilterPanel from '../components/FilterPanel';
import ChronicleTimeline from '../components/ChronicleTimeline';
import './UserPortfolio.css';
import { Avatar, Tooltip, Typography } from '@mui/material';
import { Stars, BookOpen } from 'lucide-react';

const UserPortfolio = ({ userId }) => {
  const [filters, setFilters] = useState({});
  const [chronicleData, setChronicleData] = useState([]);
  const [summaryData, setSummaryData] = useState({ tokens: 0, skills: [] });
  const [mentorStatus, setMentorStatus] = useState(false);
  const [storyStats, setStoryStats] = useState({ total: 0, recent: 0 });

  useEffect(() => {
    fetch(`/user/${userId}/chronicle`)
      .then(res => res.json())
      .then(data => {
        setChronicleData(data);
        setStoryStats({
          total: data.length,
          recent: data.filter(entry => new Date(entry.created_at) > Date.now() - 2592000000).length // last 30 days
        });
      });

    fetch(`/user/${userId}/summary`)
      .then(res => res.json())
      .then(data => setSummaryData(data));

    fetch(`/user/${userId}/mentor-status`)
      .then(res => res.json())
      .then(data => setMentorStatus(data.isMentor));
  }, [userId]);

  return (
    <div className="portfolio-page">
      <div className="header-row">
        <Typography variant="h4" color="primary">User Portfolio</Typography>
      </div>

      <TokenAndSkillSummary summary={summaryData} />

      <div className="portfolio-filters">
        <FilterPanel filters={filters} setFilters={setFilters} />
        <div className="story-stats">
          <Typography variant="body1" color="secondary"><BookOpen size={18} /> Total Stories: {storyStats.total}</Typography>
          <Typography variant="body1" color="secondary">Recent (30d): {storyStats.recent}</Typography>
        </div>
      </div>

      <ChronicleTimeline stories={chronicleData} />
    </div>
  );
};

export default UserPortfolio;
