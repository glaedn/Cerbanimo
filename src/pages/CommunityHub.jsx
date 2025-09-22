import React, { useEffect, useState } from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Avatar, 
  List, 
  ListItem, 
  ListItemAvatar, 
  ListItemText,
  Button,
  Chip,
  Divider,
  IconButton,
  Tooltip,
  Box,
  Paper,
  Link
} from '@mui/material';
import GroupIcon from '@mui/icons-material/Group';
import HowToVoteIcon from '@mui/icons-material/HowToVote';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import LoyaltyIcon from '@mui/icons-material/Loyalty';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert from '@mui/material/Alert';
import DreamCircleGrimoire from '../components/CommunityChronicle/index.jsx';
import DreamCircleResourceManagement from '../components/CommunityResourceManagement/CommunityResourceManagement.jsx';
import './DreamCircleHub.css';
import theme from '../../styles/theme';

const DreamCircleHub = () => {
    const { communityId } = useParams();
    const { user, isAuthenticated, getAccessTokenSilently } = useAuth0();
    const navigate = useNavigate();
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState('success');
    const [dreamCircle, setDreamCircle] = useState(null);
    const [dreamers, setDreamers] = useState([]);
    const [dreamerRequests, setDreamerRequests] = useState([]);
    const [intentionProposals, setIntentionProposals] = useState([]);
    const [approvedIntentions, setApprovedIntentions] = useState([]);
    const [userId, setUserId] = useState(null);
    const [blessingDelegations, setBlessingDelegations] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isDreamer, setIsDreamer] = useState(false);
    const [hasRequestedToJoinDreamCircle, setHasRequestedToJoinDreamCircle] = useState(false);
    const [isDelegating, setIsDelegating] = useState(false);
    const [delegatedTo, setDelegatedTo] = useState(null);
    const [dreamerScores, setDreamerScores] = useState([]);

    const showNotification = (message, severity = 'success') => {
        setSnackbarMessage(message);
        setSnackbarSeverity(severity);
        setSnackbarOpen(true);
      };

    const handleCloseSnackbar = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        setSnackbarOpen(false);
    };
    

    useEffect(() => {
        const fetchUserProfile = async () => {
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

                setUserId(profileResponse.data.id);
                
                // Load blessing delegations if available
                if (profileResponse.data.blessing_delegations) {
                    setBlessingDelegations(profileResponse.data.blessing_delegations);
                }
                
            } catch (error) {
                console.error('Failed to fetch user profile:', error);
                setError('Failed to load user profile. Please try again later.');
            }
        };

        fetchUserProfile();
    }, [isAuthenticated, user, getAccessTokenSilently]);

    useEffect(() => {
        const fetchDreamCircleData = async () => {
            if (!communityId || !userId) { setIsLoading(false); return; }
            
            try {
                setIsLoading(true);
                const token = await getAccessTokenSilently({
                    audience: import.meta.env.VITE_BACKEND_URL,
                    scope: 'openid profile email',
                });

                // Fetch dreamCircle details
                console.log('Fetching dreamCircle data for ID:', communityId);
const dreamCircleResponse = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/communities/${communityId}`, {
    headers: { Authorization: `Bearer ${token}` },
});
console.log('Dream Circle Data:', dreamCircleResponse.data);
setDreamCircle(dreamCircleResponse.data);

// Debug dreamers array
console.log('Dreamers array:', dreamCircleResponse.data.dreamers);
console.log('Dreamers array type:', typeof dreamCircleResponse.data.dreamers);

// Fetch dreamer details
if (dreamCircleResponse.data.dreamers && dreamCircleResponse.data.dreamers.length > 0) {
    const dreamerPromises = dreamCircleResponse.data.dreamers.map(dreamerId => {
        console.log('Fetching dreamer:', dreamerId);
        return axios.get(`${import.meta.env.VITE_BACKEND_URL}/profile/public/${dreamerId}`, {
            headers: { Authorization: `Bearer ${token}` },
        }).catch(error => {
            console.error(`Failed to fetch dreamer ${dreamerId}:`, error);
            return null;
        });
    });
    
    const dreamerResults = await Promise.all(dreamerPromises);
    const validDreamers = dreamerResults.filter(result => result !== null).map(result => result.data);
    console.log('Fetched dreamers:', validDreamers);
    setDreamers(validDreamers);

    // Fetch dreamer scores
    if (dreamCircleResponse.data.dreamers && dreamCircleResponse.data.dreamers.length > 0) {
        try {
            const scoresResponse = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/communities/${communityId}/scores`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            console.log('Fetched dreamer scores:', scoresResponse.data);
            setDreamerScores(scoresResponse.data);
        } catch (scoresError) {
            console.error('Failed to fetch dreamer scores:', scoresError);
            // Gracefully handle missing scores, perhaps set to empty or show a specific UI indicator
            setDreamerScores([]);
        }
    } else {
        setDreamerScores([]); // No dreamers, so no scores
    }

} else {
    console.log('No dreamers in this dream circle');
    setDreamers([]);
    setDreamerScores([]); // No dreamers, so no scores
}
                
                // Fetch dreamer requests
                const requestsResponse = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/communities/${communityId}/dreamer-requests`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                console.log('Dreamer Requests:', requestsResponse.data);
                console.log('User ID:', userId);
                // Check if current user has already requested to join
                if (userId) {
                    setHasRequestedToJoinDreamCircle(requestsResponse.data.some(request =>
                        String(request.user_id) === String(userId)
                    ));
                }
                
                // Fetch user data for each request
                const requestUserPromises = requestsResponse.data.map(request => 
                    axios.get(`${import.meta.env.VITE_BACKEND_URL}/profile/public/${request.user_id}`, {
                        headers: { Authorization: `Bearer ${token}` },
                    }).then(userResponse => ({
                        ...request,
                        userData: userResponse.data
                    }))
                );
                
                const requestUsers = await Promise.all(requestUserPromises);
                setDreamerRequests(requestUsers);
                
                // Fetch intention proposal details
                if (dreamCircleResponse.data.intentionProposals && dreamCircleResponse.data.intentionProposals.length > 0) {
                    const proposalPromises = dreamCircleResponse.data.intentionProposals.map(intentionId =>
                        axios.get(`${import.meta.env.VITE_BACKEND_URL}/intentions/${intentionId}`, {
                            headers: { Authorization: `Bearer ${token}` },
                        })
                    );
                    
                    const proposalResults = await Promise.all(proposalPromises);
                    setIntentionProposals(proposalResults.map(result => result.data));
                }
                
                // Fetch approved intentions
                if (dreamCircleResponse.data.approvedIntentions && dreamCircleResponse.data.approvedIntentions.length > 0) {
                    const intentionPromises = dreamCircleResponse.data.approvedIntentions.map(intentionId =>
                        axios.get(`${import.meta.env.VITE_BACKEND_URL}/intentions/${intentionId}`, {
                            headers: { Authorization: `Bearer ${token}` },
                        })
                    );
                    
                    const intentionResults = await Promise.all(intentionPromises);
                    setApprovedIntentions(intentionResults.map(result => result.data));
                }
                
            } catch (error) {
                console.error('Failed to fetch dream circle data:', error);
                setError('Failed to load Dream Circle data. Please try again later.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchDreamCircleData();
    }, [communityId, getAccessTokenSilently, userId]);

    // This is the updated useEffect for delegation status
    useEffect(() => {
        // Check if we have all the necessary data
        if (dreamCircle && userId && dreamers.length > 0) {
            // Check if dreamCircle has blessing_delegations property and if user has delegated their blessing
            if (dreamCircle.blessing_delegations) {
                const userIdStr = String(userId);
                const isDelegatingNow = Object.keys(dreamCircle.blessing_delegations).includes(userIdStr);
                setIsDelegating(isDelegatingNow);
                
                if (isDelegatingNow) {
                    const delegatedToId = dreamCircle.blessing_delegations[userIdStr];
                    const delegatedDreamer = dreamers.find(dreamer =>
                        String(dreamer.id) === String(delegatedToId)
                    );
                    setDelegatedTo(delegatedDreamer);
                } else {
                    setDelegatedTo(null);
                }
            } else {
                // Reset delegation state if no delegations exist
                setIsDelegating(false);
                setDelegatedTo(null);
            }
        }
    }, [dreamCircle, userId, dreamers]); // Dependencies ensure it runs when any of these change

    useEffect(() => {
        if (dreamCircle && userId) {
            // Check if userId exists in dreamCircle.dreamers array
            // Note: We use String() to ensure type consistency in comparison
            const dreamerCheck = dreamCircle.dreamers.some(dreamerId =>
                String(dreamerId) === String(userId)
            );
            setIsDreamer(dreamerCheck);
        }
    }, [dreamCircle, userId]);

    const handleRequestJoinDreamCircle = async () => {
        try {
            const token = await getAccessTokenSilently({
                audience: import.meta.env.VITE_BACKEND_URL,
                scope: 'openid profile email',
            });

            await axios.post(`${import.meta.env.VITE_BACKEND_URL}/communities/${communityId}/request`,
                { userId },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setHasRequestedToJoinDreamCircle(true);
            showNotification(`Your request to join the ${theme.terminology.community} has been submitted!`);
            
        } catch (error) {
            console.error('Failed to submit join request:', error);
            showNotification(`Failed to submit your request to join the ${theme.terminology.community}. Please try again.`, 'error');
        }
    };

    const handleBlessIntention = async (intentionId, blessing) => {
        if (!isDreamer) return;
        
        try {
            const token = await getAccessTokenSilently({
                audience: 'import.meta.env.VITE_BACKEND_URL',
                scope: 'openid profile email',
            });
    
            // Get the intention name before blessing for potential notification
            const intentionBeforeBlessing = intentionProposals.find(p => p.id === intentionId);
            const intentionName = intentionBeforeBlessing?.name || "Intention";
    
            // Send blessing to server
            const blessingResponse = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/communities/${communityId}/bless/intention/${intentionId}`,
                { userId, blessing },
                { headers: { Authorization: `Bearer ${token}` } }
            );
    
            // Check if the blessing led to consensus (server should return this info)
            const wasWithheld = blessingResponse.data?.failed;
            const wasBlessed = blessingResponse.data?.passed;
            
            // Show appropriate message if consensus was reached
            
            if (wasBlessed) {
                showNotification(`${intentionName} has been blessed by the ${theme.terminology.community} and moved to active intentions!`, 'success');
            } else if (wasWithheld) {
                showNotification(`${intentionName} has been withheld by the ${theme.terminology.community}.`);
            }
            
    
            // Refresh the entire dream circle data after blessing
            const dreamCircleResponse = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/communities/${communityId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            
            setDreamCircle(dreamCircleResponse.data);
    
            // After blessing, we need to fully refresh both intention proposals and approved intentions
            // First, get all current intention proposals from the API
            if (dreamCircleResponse.data.intentionProposals && dreamCircleResponse.data.intentionProposals.length > 0) {
                const proposalPromises = dreamCircleResponse.data.intentionProposals.map(propId =>
                    axios.get(`${import.meta.env.VITE_BACKEND_URL}/intentions/${propId}`, {
                        headers: { Authorization: `Bearer ${token}` },
                    })
                );
                
                const proposalResults = await Promise.all(proposalPromises);
                setIntentionProposals(proposalResults.map(result => result.data));
            } else {
                // If no intention proposals are left, set to empty array
                setIntentionProposals([]);
            }
            
            // Then get all approved intentions from the API
            if (dreamCircleResponse.data.approvedIntentions && dreamCircleResponse.data.approvedIntentions.length > 0) {
                const intentionPromises = dreamCircleResponse.data.approvedIntentions.map(projId =>
                    axios.get(`${import.meta.env.VITE_BACKEND_URL}/intentions/${projId}`, {
                        headers: { Authorization: `Bearer ${token}` },
                    })
                );
                
                const intentionResults = await Promise.all(intentionPromises);
                setApprovedIntentions(intentionResults.map(result => result.data));
            } else {
                // If no approved intentions, set to empty array
                setApprovedIntentions([]);
            }
            
        } catch (error) {
            console.error('Failed to bless intention:', error);
            showNotification('Failed to submit your blessing. Please try again.', 'error');
        }
    };

    const handleBlessDreamer = async (requestUserId, blessing) => {
        if (!isDreamer) return;
        
        try {
            const token = await getAccessTokenSilently({
                audience: 'import.meta.env.VITE_BACKEND_URL',
                scope: 'openid profile email',
            });

            await axios.post(`${import.meta.env.VITE_BACKEND_URL}/communities/${communityId}/bless/dreamer/${requestUserId}`,
                { userId,                  
                 blessing },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // Refresh dreamer requests after blessing
            const requestsResponse = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/communities/${communityId}/dreamer-requests`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            
            // Fetch user data for each request
            const requestUserPromises = requestsResponse.data.map(request => 
                axios.get(`${import.meta.env.VITE_BACKEND_URL}/profile/public/${request.user_id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                }).then(userResponse => ({
                    ...request,
                    userData: userResponse.data
                }))
            );
            
            const requestUsers = await Promise.all(requestUserPromises);
            setDreamerRequests(requestUsers);
            
            // Refresh dream circle to get updated dreamer list
            const dreamCircleResponse = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/communities/${communityId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            
            setDreamCircle(dreamCircleResponse.data);
            
        } catch (error) {
            console.error('Failed to bless dreamer:', error);
            showNotification('Failed to submit your blessing. Please try again.', 'error');
        }
    };

    const handleDelegateBlessing = async (delegateToUserId) => {
        if (!isDreamer) return;
        
        try {
            const token = await getAccessTokenSilently({
                audience: 'import.meta.env.VITE_BACKEND_URL',
                scope: 'openid profile email',
            });

            await axios.post(`${import.meta.env.VITE_BACKEND_URL}/communities/${communityId}/delegate-blessing/${userId}`,
                { delegateTo: delegateToUserId },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // Update local state with delegation
            setBlessingDelegations({
                ...blessingDelegations,
                [communityId]: delegateToUserId
            });
            
            // Refresh dream circle data to get updated blessing delegations
            const dreamCircleResponse = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/communities/${communityId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            
            setDreamCircle(dreamCircleResponse.data);
            
            showNotification('Blessing delegation successful!');
            
        } catch (error) {
            console.error('Failed to delegate blessing:', error);
            showNotification('Failed to delegate your blessing. Please try again.', 'error');
        }
    };

    const handleRevokeBlessing = async () => {
        if (!isDreamer) return;
        
        try {
            const token = await getAccessTokenSilently({
                audience: 'import.meta.env.VITE_BACKEND_URL',
                scope: 'openid profile email',
            });

            await axios.post(`${import.meta.env.VITE_BACKEND_URL}/communities/${communityId}/revoke-blessing/${userId}`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // Update local state
            const newDelegations = { ...blessingDelegations };
            delete newDelegations[communityId];
            setBlessingDelegations(newDelegations);
            
            // Refresh dream circle data to get updated blessing delegations
            const dreamCircleResponse = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/communities/${communityId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            
            setDreamCircle(dreamCircleResponse.data);
            
            showNotification('Blessing delegation revoked!');
            
        } catch (error) {
            console.error('Failed to revoke blessing delegation:', error);
            showNotification('Failed to revoke your blessing delegation. Please try again.', 'error');
        }
    };

    if (isLoading) {
        return <Typography className="loading-container" sx={{ textAlign: 'center', padding: 3 }}>{`Loading ${theme.terminology.community} data...`}</Typography>;
    }

    if (error) {
        return <Typography className="error-container" sx={{ textAlign: 'center', padding: 3 }}>{`Failed to load ${theme.terminology.community} data. Please try again later.`}</Typography>;
    }

    if (!dreamCircle) {
        return <Typography className="error-container" sx={{ textAlign: 'center', padding: 3 }}>{`${theme.terminology.community} not found`}</Typography>;
    }

    return (
        <div className="dream-circle-hub">
            <Typography variant="h4" className="hub-title">{dreamCircle.name}</Typography>
            
            {/* Dream Circle Info Section */}
            <div className="dream-circle-info">
                <Typography variant="body1" className="dream-circle-description">{dreamCircle.description}</Typography>
                <div className="tag-container">
                    {dreamCircle.interest_tags && dreamCircle.interest_tags.map((tag, index) => (
                        <Chip key={index} label={tag} sx={{ /* className='interest-tag' removed, use sx if direct styling needed */ }} />
                    ))}
                </div>
                
                {/* Join Request Button for non-dreamers */}
                {!isDreamer && (
                    <Box mt={3} display="flex" justifyContent="center">
                        <Paper elevation={3} className="join-request-container" sx={{ padding: 3, maxWidth: 500 }}>
                            <Typography variant="h6" align="center" gutterBottom>
                                {`You're not a ${theme.terminology.dreamer} in this ${theme.terminology.community} yet`}
                            </Typography>
                            <Typography variant="body2" align="center" paragraph>
                                {`Join this ${theme.terminology.community} to participate in ${theme.terminology.peer_review_approval}s, propose ${theme.terminology.project_plural}, and connect with other ${theme.terminology.dreamer_plural}.`}
                            </Typography>
                            <Box display="flex" justifyContent="center">
                                {hasRequestedToJoinDreamCircle ? (
                                    <Button 
                                        variant="contained" 
                                        color="primary" 
                                        disabled 
                                        startIcon={<PersonAddIcon />}
                                    >
                                        {`${theme.terminology.community} Request Pending`}
                                    </Button>
                                ) : (
                                    <Button 
                                        variant="contained" 
                                        color="primary" 
                                        onClick={handleRequestJoinDreamCircle}
                                        startIcon={<PersonAddIcon />}
                                    >
                                        {`Request to Join ${theme.terminology.community}`}
                                    </Button>
                                )}
                            </Box>
                        </Paper>
                    </Box>
                )}
            </div>
            
            {/* Main Content Grid */}
            <div className="hub-grid">
                {/* Dreamers Card */}
                <div className="hub-grid-item">
                    <Card className="hub-card dreamers-card">
                        <CardContent>
                            <GroupIcon className="hub-icon" />
                            <Typography variant="h5" sx={{ color: 'var(--hud-text-primary)', textShadow: '0 0 5px var(--hud-glow-color)' }}>{theme.terminology.dreamer_plural}</Typography>
                            
                            {isDreamer && isDelegating && (
                                <div className="delegation-info">
                                    <Typography variant="body2" sx={{color: 'var(--hud-text-color)'}}>
                                        {`You've delegated your ${theme.terminology.peer_review_approval} to:`} <strong style={{color: 'var(--hud-secondary-color)'}}>{delegatedTo?.username || `Unknown ${theme.terminology.dreamer}`}</strong>
                                    </Typography>
                                    <Button 
                                        variant="outlined" 
                                        size="small" 
                                        onClick={handleRevokeBlessing}
                                        className="revoke-button" // CSS class for specific margin if needed
                                        sx={{ 
                                            color: 'var(--hud-secondary-color)', 
                                            borderColor: 'var(--hud-secondary-color)',
                                            '&:hover': { 
                                                borderColor: 'var(--hud-glow-secondary-color)', 
                                                backgroundColor: 'rgba(var(--hud-secondary-color-rgb), 0.1)',
                                                boxShadow: '0 0 8px var(--hud-glow-secondary-color)',
                                            }
                                        }}
                                    >
                                        {`Revoke ${theme.terminology.peer_review_approval}`}
                                    </Button>
                                </div>
                            )}
                            
                            <List className="dreamer-list" key={`dreamer-list-${dreamCircleId}`}>
                                {dreamers.map((dreamer) => (
                                    <ListItem 
                                        key={dreamer.id}
                                        className="dreamer-entry" // CSS handles base style
                                        sx={{ 
                                            cursor: 'pointer',
                                            '&:hover': {
                                                borderColor: 'var(--hud-primary-color)', // From CSS: rgba(var(--hud-primary-color-rgb), 0.4)
                                            }
                                        }}
                                        onClick={() => navigate(`/profile/public/${dreamer.id}`)}
                                    >
                                        <ListItemAvatar>
                                            <Avatar 
                                                src={`${import.meta.env.VITE_BACKEND_URL}${dreamer.profile_picture}`}
                                                alt={dreamer.name}
                                                sx={{ 
                                                    borderColor: 'var(--hud-border-color)', 
                                                    borderWidth: '1px', 
                                                    borderStyle: 'solid',
                                                    boxShadow: '0 0 3px var(--hud-glow-color)',
                                                    '&:hover': {
                                                        boxShadow: '0 0 8px var(--hud-glow-color)',
                                                    }
                                                }}
                                            />
                                        </ListItemAvatar>
                                        <ListItemText 
                                            primaryTypographyProps={{ sx: { color: 'var(--hud-text-color)', fontWeight: '500' } }}
                                            secondaryTypographyProps={{ sx: { color: 'var(--hud-text-secondary)', fontSize: '0.8rem' } }}
                                            primary={dreamer.username}
                                            secondary={`ID: ${dreamer.id} - Score: ${
                                                dreamerScores.find(scoreEntry => scoreEntry.id === dreamer.id)?.dreamerScore || 0
                                            }`} 
                                        />
                                        {isDreamer && !isDelegating && userId !== dreamer.id && (
                                            <Button 
                                                variant="outlined" 
                                                size="small"
                                                onClick={(e) => {
                                                    e.stopPropagation(); // Prevent ListItem click
                                                    handleDelegateBlessing(dreamer.id);
                                                }}
                                                sx={{
                                                    color: 'var(--hud-primary-color)',
                                                    borderColor: 'var(--hud-primary-color)',
                                                    marginLeft: 'auto', // Push to the right
                                                    '&:hover': {
                                                        backgroundColor: 'rgba(var(--hud-primary-color-rgb), 0.1)',
                                                        borderColor: 'var(--hud-glow-color)',
                                                        boxShadow: '0 0 5px var(--hud-glow-color)',
                                                    }
                                                }}
                                            >
                                                {`Delegate ${theme.terminology.peer_review_approval}`}
                                            </Button>
                                        )}
                                    </ListItem>
                                ))}
                            </List>
                        </CardContent>
                    </Card>
                </div>
                
                {/* Blessing Card - Intentions */}
                {isDreamer && (
                    <div className="hub-grid-item">
                        <Card className="hub-card blessing-card">
                            <CardContent>
                                <HowToVoteIcon className="hub-icon" />
                                <Typography variant="h5" sx={{ color: 'var(--hud-text-primary)', textShadow: '0 0 5px var(--hud-glow-color)' }}>{`${theme.terminology.project_plural} Proposals`}</Typography>
                                {intentionProposals.length === 0 ? (
                                    <Typography variant="body2" className="no-items" sx={{color: 'var(--hud-text-secondary)'}}>{`No active ${theme.terminology.project_plural} proposals`}</Typography>
                                ) : (
                                    <List className="proposal-list">
                                        {intentionProposals.map((proposal) => (
                                            <ListItem key={proposal.id} className="proposal-entry">
                                                <div className="proposal-content">
                                                    <Link
                                                        component="button"
                                                        variant="h6"
                                                        onClick={() => navigate(`/visualizer/${proposal.id}`)}
                                                        className="clickable-title" // CSS handles base style
                                                        sx={{ 
                                                            textAlign: 'center', 
                                                            display: 'block', // Ensure it takes full width for centering
                                                            marginBottom: '8px',
                                                            // sx for Link component might need different approach for color if not inheriting
                                                        }}
                                                    >
                                                        {proposal.name}
                                                    </Link>
                                                    <Typography variant="body2" className="proposal-description" sx={{color: 'var(--hud-text-secondary)'}}>
                                                        {proposal.description}
                                                    </Typography>
                                                    <div className="tag-container small-tags" style={{marginTop: '10px', marginBottom: '10px'}}>
                                                        {proposal.tags && proposal.tags.map((tag, idx) => (
                                                            <Chip 
                                                                key={idx} 
                                                                label={tag} 
                                                                size="small" 
                                                                // sx from CSS: .tag-container .MuiChip-root
                                                            />
                                                        ))}
                                                    </div>
                                                    
                                                    <div className="blessing-info">
                                                        <Typography variant="body2" sx={{color: 'var(--hud-text-secondary)'}}>
                                                            {`Current ${theme.terminology.peer_review_approval}s: ${
                                                                proposal.dream_circle_blessings ?
                                                                Object.values(proposal.dream_circle_blessings).filter(v => v === true).length : 0
                                                            } ${theme.terminology.peer_review_approval}s / ${
                                                                proposal.dream_circle_blessings ?
                                                                Object.values(proposal.dream_circle_blessings).filter(v => v === false).length : 0
                                                            } Withholds`}
                                                        </Typography>
                                                    </div>
                                                    
                                                    <div className="blessing-actions">
                                                        <Tooltip title={theme.terminology.peer_review_approval}>
                                                            <IconButton 
                                                                onClick={() => handleBlessIntention(proposal.id, true)}
                                                                sx={{ 
                                                                    color: 'var(--hud-success-color)', 
                                                                    '&:hover': { 
                                                                        backgroundColor: 'rgba(var(--hud-success-color-rgb, 46, 204, 64), 0.1)', // Define --hud-success-color-rgb or use static
                                                                        boxShadow: '0 0 8px var(--hud-success-color)',
                                                                    }
                                                                }}
                                                            >
                                                                <CheckCircleIcon />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title="Withhold">
                                                            <IconButton 
                                                                onClick={() => handleBlessIntention(proposal.id, false)}
                                                                sx={{ 
                                                                    color: 'var(--hud-error-color)', 
                                                                    '&:hover': { 
                                                                        backgroundColor: 'rgba(var(--hud-error-color-rgb, 255, 65, 54), 0.1)', // Define --hud-error-color-rgb or use static
                                                                        boxShadow: '0 0 8px var(--hud-error-color)',
                                                                    }
                                                                }}
                                                            >
                                                                <CancelIcon />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </div>
                                                </div>
                                            </ListItem>
                                        ))}
                                    </List>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}
                
                {/* Dreamer Requests Card - Only for dreamers */}
                {isDreamer && (
                    <div className="hub-grid-item">
                        <Card className="hub-card dreamer-requests-card">
                            <CardContent>
                                <PersonAddIcon className="hub-icon" />
                                <Typography variant="h5" sx={{ color: 'var(--hud-text-primary)', textShadow: '0 0 5px var(--hud-glow-color)' }}>{`${theme.terminology.dreamer} Join Requests`}</Typography>
                                {dreamerRequests.length === 0 ? (
                                    <Typography variant="body2" className="no-items" sx={{color: 'var(--hud-text-secondary)'}}>{`No pending ${theme.terminology.dreamer} join requests`}</Typography>
                                ) : (
                                    <List className="request-list">
                                        {dreamerRequests.map((request) => (
                                            <ListItem key={request.user_id} className="request-entry">
                                                <ListItemAvatar>
                                                    <Avatar 
                                                        src={`${import.meta.env.VITE_BACKEND_URL}${request.userData.profile_picture}`}
                                                        alt={request.userData.name} 
                                                        onClick={() => navigate(`/profile/public/${request.user_id}`)}
                                                        className="clickable-avatar" // CSS handles hover border
                                                        sx={{ 
                                                            borderColor: 'var(--hud-border-color)', 
                                                            borderWidth: '1px', 
                                                            borderStyle: 'solid',
                                                            boxShadow: '0 0 3px var(--hud-glow-color)',
                                                        }}
                                                    />
                                                </ListItemAvatar>
                                                <ListItemText 
                                                    primary={
                                                        <Link 
                                                            component="button" // Make it behave like a button for onClick
                                                            onClick={() => navigate(`/profile/public/${request.user_id}`)}
                                                            className="clickable-name" // CSS handles base style
                                                            sx={{
                                                                color: 'var(--hud-text-color)', // Ensure correct color
                                                                '&:hover': { color: 'var(--hud-text-primary)'} // Ensure correct hover color
                                                            }}
                                                        >
                                                            {request.userData.username}
                                                        </Link>
                                                    } 
                                                    secondary={`ID: ${request.user_id}`} 
                                                    secondaryTypographyProps={{ sx: { color: 'var(--hud-text-secondary)', fontSize: '0.8rem' } }}
                                                />
                                                <div className="blessing-actions">
                                                    <Tooltip title={theme.terminology.peer_review_approval}>
                                                        <IconButton 
                                                            onClick={() => handleBlessDreamer(request.user_id, true)}
                                                            sx={{ 
                                                                color: 'var(--hud-success-color)', 
                                                                '&:hover': { 
                                                                    backgroundColor: 'rgba(var(--hud-success-color-rgb, 46, 204, 64), 0.1)',
                                                                    boxShadow: '0 0 8px var(--hud-success-color)',
                                                                }
                                                            }}
                                                        >
                                                            <CheckCircleIcon />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Withhold">
                                                        <IconButton 
                                                            onClick={() => handleBlessDreamer(request.user_id, false)}
                                                            sx={{ 
                                                                color: 'var(--hud-error-color)', 
                                                                '&:hover': { 
                                                                    backgroundColor: 'rgba(var(--hud-error-color-rgb, 255, 65, 54), 0.1)',
                                                                    boxShadow: '0 0 8px var(--hud-error-color)',
                                                                }
                                                            }}
                                                        >
                                                            <CancelIcon />
                                                        </IconButton>
                                                    </Tooltip>
                                                </div>
                                            </ListItem>
                                        ))}
                                    </List>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}
                {/* Active Intentions Card - Visible to all */}
                <div className={`hub-grid-item ${isDreamer ? 'wide-item' : 'full-width-item'}`}>
                    <Card className="hub-card intentions-card">
                        <CardContent>
                            <RocketLaunchIcon className="hub-icon" />
                            <Typography variant="h5" sx={{ color: 'var(--hud-text-primary)', textShadow: '0 0 5px var(--hud-glow-color)' }}>{`Active ${theme.terminology.project_plural}`}</Typography>
                            {approvedIntentions.length === 0 ? (
                                <Typography variant="body2" className="no-items" sx={{color: 'var(--hud-text-secondary)'}}>{`No active ${theme.terminology.project_plural}`}</Typography>
                            ) : (
                                <div className="intentions-grid">
                                    {approvedIntentions.map((intention) => (
                                        <Card key={intention.id} className="intention-card"> {/* CSS handles this card's theme */}
                                            <CardContent>
                                                <Link
                                                    component="button"
                                                    variant="h6"
                                                    onClick={() => navigate(`/visualizer/${intention.id}`)}
                                                    className="clickable-title" // CSS handles base style
                                                    sx={{ textAlign: 'center', display: 'block', marginBottom: '8px' }}
                                                >
                                                    {intention.name}
                                                </Link>
                                                <Typography variant="body2" className="intention-description" sx={{color: 'var(--hud-text-secondary)'}}>
                                                    {intention.description}
                                                </Typography>
                                                <div className="tag-container small-tags" style={{marginTop: '10px', marginBottom: '10px'}}>
                                                    {intention.tags && intention.tags.map((tag, idx) => (
                                                        <Chip key={idx} label={tag} size="small" /* sx from CSS */ />
                                                    ))}
                                                </div>
                                                <Button 
                                                    variant="outlined" 
                                                    onClick={() => navigate(`/visualizer/${intention.id}`)}
                                                    className="view-intention-btn" // CSS handles margin-top: auto
                                                    sx={{
                                                        color: 'var(--hud-primary-color)',
                                                        borderColor: 'var(--hud-primary-color)',
                                                        '&:hover': {
                                                            backgroundColor: 'rgba(var(--hud-primary-color-rgb), 0.1)',
                                                            borderColor: 'var(--hud-glow-color)',
                                                            boxShadow: '0 0 8px var(--hud-glow-color)',
                                                        }
                                                    }}
                                                >
                                                    {theme.terminology.view_project}
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
            <DreamCircleResourceManagement dreamCircleId={dreamCircleId} />
            <DreamCircleGrimoire dreamCircleId={dreamCircleId} />
            <Snackbar 
  open={snackbarOpen} 
  autoHideDuration={6000} 
  onClose={handleCloseSnackbar}
  anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
>
                <MuiAlert 
                    elevation={6} 
                    variant="filled" 
                    onClose={handleCloseSnackbar} 
                    severity={snackbarSeverity}
                    sx={{
                        backgroundColor: snackbarSeverity === 'success' ? 'var(--hud-success-color)' : 'var(--hud-error-color)',
                        color: '#fff', // Ensuring text is white on colored background
                        '.MuiAlert-icon': { color: '#fff' } // Ensuring icon is white
                    }}
                >
                    {snackbarMessage}
                </MuiAlert>
</Snackbar>
        </div>
    );
};

export default DreamCircleHub;