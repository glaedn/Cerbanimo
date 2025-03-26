import React, { useEffect, useState } from 'react';
import { Card, CardContent, Typography, Avatar, List, ListItem, ListItemAvatar, ListItemText } from '@mui/material';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import StarsIcon from '@mui/icons-material/Stars';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';  // ✅ Import Auth0

import './RewardDashboard.css';

const RewardDashboard = () => {
    const { user, isAuthenticated, getAccessTokenSilently } = useAuth0(); // ✅ Auth0 hooks
    const [tokens, setTokens] = useState(0);
    const [badges, setBadges] = useState([]);
    const [leaderboard, setLeaderboard] = useState([]);

    useEffect(() => {
        const fetchRewards = async () => {
            if (!isAuthenticated || !user) return; // ✅ Ensure user is authenticated

            try {
                const token = await getAccessTokenSilently({
                    audience: 'http://localhost:4000',
                    scope: 'openid profile email',
                });

                const response = await axios.get(`http://localhost:4000/rewards/user/15`, {  // ✅ Use Auth0 user ID
                    headers: { Authorization: `Bearer ${token}` },
                });

                setTokens(response.data.tokens);
                setBadges(response.data.badges);
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
                            <div className="badges-container">
                                {badges.map((badge, index) => (
                                    <Avatar key={index} src={badge.icon} alt={badge.name} className="badge-avatar" />
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
                                    <ListItem key={index} className="leaderboard-entry">
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
            </div>
        </div>
    );
};

export default RewardDashboard;
