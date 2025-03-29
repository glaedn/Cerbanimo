import React, { useEffect, useState } from 'react';
import { Card, CardContent, Typography, Avatar, List, ListItem, ListItemAvatar, ListItemText } from '@mui/material';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import StarsIcon from '@mui/icons-material/Stars';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import TaskBrowser from './TaskBrowser.jsx';

import './RewardDashboard.css';

const RewardDashboard = () => {
    const { user, isAuthenticated, getAccessTokenSilently } = useAuth0();
    const [tokens, setTokens] = useState(0);
    const [badges, setBadges] = useState([]);
    const [leaderboard, setLeaderboard] = useState([]);

    const navigate = useNavigate();
    
    useEffect(() => {
        const fetchRewards = async () => {
            if (!isAuthenticated || !user) return;

            try {
                const token = await getAccessTokenSilently({
                    audience: 'http://localhost:4000',
                    scope: 'openid profile email',
                });

                const profileResponse = await axios.get('http://localhost:4000/profile', {
                    params: { 
                        sub: user.sub, 
                        email: user.email, 
                        name: user.name 
                    },
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });

                const response = await axios.get(`http://localhost:4000/rewards/user/${profileResponse.data.id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                setTokens(response.data.tokens);
                setBadges(response.data.badges);
                console.log(response.data.badges);
            } catch (error) {
                console.error('Failed to fetch rewards:', error);
            }
        };

        const fetchLeaderboard = async () => {
            try {
                const token = await getAccessTokenSilently({
                    audience: 'http://localhost:4000',
                    scope: 'openid profile email',
                });

                const response = await axios.get('http://localhost:4000/rewards/leaderboard', {
                    headers: { Authorization: `Bearer ${token}` },
                });

                setLeaderboard(response.data);
            } catch (error) {
                console.error('Failed to fetch leaderboard:', error);
            }
        };

        fetchRewards();
        fetchLeaderboard();
    }, [isAuthenticated, user, getAccessTokenSilently]);

    return (
        <div className="reward-dashboard">
            <Typography variant="h4" className="dashboard-title">Reward Dashboard</Typography>
            <div className="dashboard-grid">
                {/* Tokens Card */}
                <div className="dashboard-grid-item">
                    <Card className="reward-card token-card">
                        <CardContent>
                            <RocketLaunchIcon className="reward-icon" />
                            <Typography variant="h5">Tokens</Typography>
                            <Typography variant="h4" className="reward-value">{tokens}</Typography>
                        </CardContent>
                    </Card>
                </div>
                {/* Badges Card */}
                <div className="dashboard-grid-item">
                    <Card className="reward-card badge-card">
                        <CardContent>
                            <StarsIcon className="reward-icon" />
                            <Typography variant="h5">Badges</Typography>
                            <div className="badge-container">
                                {badges.map((badge, index) => (
                                    <div key={index} className="badge-item">
                                      <Avatar 
                                        src={`http://localhost:4000${badge.icon}`} 
                                        alt={badge.name} 
                                        className="badge-avatar"
                                      />
                                      <Typography variant="body2" className="badge-name">
                                        {badge.name}
                                      </Typography>
                                      {badge.description && (
                                        <div className="badge-description">{badge.description}</div>
                                     )}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
                {/* Leaderboard Card */}
                <div className="dashboard-grid-item">
                    <Card className="reward-card leaderboard-card">
                        <CardContent>
                            <EmojiEventsIcon className="reward-icon" />
                            <Typography variant="h5">Leaderboard</Typography>
                            <List>
                                {leaderboard.map((user, index) => (
                                    <ListItem 
                                        key={index} 
                                        className="leaderboard-entry"
                                        sx={{ cursor: 'pointer' }} // Add cursor style to indicate clickability
                                        onClick={() => navigate(`/profile/public/${user.id}`)}
                                    >
                                        <ListItemAvatar>
                                            <Avatar src={user.avatar} alt={user.username} />
                                        </ListItemAvatar>
                                        <ListItemText primary={user.username} secondary={`Score: ${user.cotokens}`} />
                                    </ListItem>
                                ))}
                            </List>
                        </CardContent>
                    </Card>
                </div>
                <div className="task-browser-wrapper"><TaskBrowser />
                </div>
            </div>
        </div>
    );
};

export default RewardDashboard;