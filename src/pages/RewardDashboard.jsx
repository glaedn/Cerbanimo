import React, { useEffect, useState } from 'react';
import { Card, CardContent, Typography, Avatar, List, ListItem, ListItemAvatar, ListItemText, Box } from '@mui/material';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import StarsIcon from '@mui/icons-material/Stars';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import TaskBrowser from './TaskBrowser.jsx';
import { useIsMobile } from '../hooks/useIsMobile';

import './RewardDashboard.css';

const RewardDashboard = () => {
    const isMobile = useIsMobile();
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
                    audience: import.meta.env.VITE_BACKEND_URL,
                    scope: 'openid profile email',
                });

                const profileResponse = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/profile`, {
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

                const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/rewards/user/${profileResponse.data.id}`, {
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
                    audience: import.meta.env.VITE_BACKEND_URL,
                    scope: 'openid profile email',
                });

                const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/rewards/leaderboard`, {
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
        <div className={`reward-dashboard ${isMobile ? 'mobile-dashboard' : ''}`}>
            <Typography
                variant={isMobile ? "h5" : "h4"}
                className="dashboard-title"
                sx={{ fontFamily: 'Orbitron', color: '#00f3ff', textShadow: '0 0 10px #00f3ff' }}
            >
                REWARD PROTOCOL
            </Typography>

            <Box className="dashboard-grid" sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 2 }}>
                {/* Tokens Card */}
                <div className="dashboard-grid-item">
                    <Card className="reward-card token-card cyber-panel">
                        <CardContent>
                            <RocketLaunchIcon className="reward-icon" />
                            <Typography variant="h5" sx={{ fontFamily: 'Orbitron' }}>TOKENS</Typography>
                            <Typography variant="h4" className="reward-value" sx={{ fontFamily: 'Orbitron', color: '#ff5ca2' }}>{tokens}</Typography>
                        </CardContent>
                    </Card>
                </div>

                {/* Badges Card */}
                <div className="dashboard-grid-item">
                    <Card className="reward-card badge-card cyber-panel">
                        <CardContent>
                            <StarsIcon className="reward-icon" />
                            <Typography variant="h5" sx={{ fontFamily: 'Orbitron' }}>BADGES</Typography>
                            <div className="badge-container">
                                {badges.length > 0 ? badges.map((badge, index) => (
                                    <div key={index} className="badge-item">
                                        <Avatar 
                                            src={`${import.meta.env.VITE_BACKEND_URL}${badge.icon}`}
                                            alt={badge.name} 
                                            className="badge-avatar"
                                            sx={{ border: '1px solid #00f3ff' }}
                                        />
                                        <Typography variant="body2" className="badge-name">
                                            {badge.name.toUpperCase()}
                                        </Typography>
                                        {badge.description && (
                                            <div className="badge-description">{badge.description}</div>
                                        )}
                                    </div>
                                )) : (
                                    <Typography variant="body2" sx={{ color: '#888', mt: 2 }}>NO BADGES ACQUIRED</Typography>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Leaderboard Card */}
                <div className="dashboard-grid-item">
                    <Card className="reward-card leaderboard-card cyber-panel">
                        <CardContent>
                            <EmojiEventsIcon className="reward-icon" />
                            <Typography variant="h5" sx={{ fontFamily: 'Orbitron' }}>LEADERBOARD</Typography>
                            <List sx={{ mt: 1 }}>
                                {leaderboard.map((user, index) => (
                                    <ListItem 
                                        key={index} 
                                        className="leaderboard-entry"
                                        sx={{
                                            cursor: 'pointer',
                                            border: '1px solid rgba(0, 243, 255, 0.2)',
                                            mb: 1,
                                            borderRadius: '4px',
                                            '&:hover': { bgcolor: 'rgba(0, 243, 255, 0.1)' }
                                        }}
                                        onClick={() => navigate(`/profile/public/${user.id}`)}
                                    >
                                        <Typography variant="body1" sx={{ marginRight: '10px', fontFamily: 'Orbitron', color: '#00f3ff' }}>
                                            {index + 1}
                                        </Typography>
                                        <ListItemAvatar>
                                            <Avatar src={`${import.meta.env.VITE_BACKEND_URL}${user.avatar}`} alt={user.username} sx={{ border: '1px solid #ff5ca2' }} />
                                        </ListItemAvatar>
                                        <ListItemText
                                            primary={user.username.toUpperCase()}
                                            secondary={`SCORE: ${user.cotokens}`}
                                            primaryTypographyProps={{ sx: { fontFamily: 'Orbitron', fontSize: '0.9rem' } }}
                                            secondaryTypographyProps={{ sx: { color: '#888' } }}
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        </CardContent>
                    </Card>
                </div>
            </Box>

            <div className="task-browser-wrapper" style={{ marginTop: isMobile ? '20px' : '40px' }}>
                <TaskBrowser />
            </div>
        </div>
    );
};

export default RewardDashboard;
