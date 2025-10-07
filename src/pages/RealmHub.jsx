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
import RealmChronicle from '../components/RealmChronicle/index.jsx';
import RealmResourceManagement from '../components/RealmResourceManagement/RealmResourceManagement.jsx';
import './RealmHub.css';

const RealmHub = () => {
    const { realmId } = useParams();
    const { user, isAuthenticated, getAccessTokenSilently } = useAuth0();
    const navigate = useNavigate();
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState('success');
    const [realm, setRealm] = useState(null);
    const [members, setMembers] = useState([]);
    const [membershipRequests, setMembershipRequests] = useState([]);
    const [proposals, setProposals] = useState([]);
    const [approvedIntentions, setApprovedIntentions] = useState([]);
    const [userId, setUserId] = useState(null);
    const [voteDelegations, setVoteDelegations] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isMember, setIsMember] = useState(false);
    const [hasRequestedJoin, setHasRequestedJoin] = useState(false);
    const [isDelegating, setIsDelegating] = useState(false);
    const [delegatedTo, setDelegatedTo] = useState(null);
    const [memberScores, setMemberScores] = useState([]);

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
                
                // Load vote delegations if available
                if (profileResponse.data.vote_delegations) {
                    setVoteDelegations(profileResponse.data.vote_delegations);
                }
                
            } catch (error) {
                console.error('Failed to fetch user profile:', error);
                setError('Failed to load user profile. Please try again later.');
            }
        };

        fetchUserProfile();
    }, [isAuthenticated, user, getAccessTokenSilently]);

    useEffect(() => {
        const fetchRealmData = async () => {
            if (!realmId || !userId) { setIsLoading(false); return; }
            
            try {
                setIsLoading(true);
                const token = await getAccessTokenSilently({
                    audience: import.meta.env.VITE_BACKEND_URL,
                    scope: 'openid profile email',
                });

                // Fetch realm details
                console.log('Fetching realm data for ID:', realmId);
                const realmResponse = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/realms/${realmId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                console.log('Realm Data:', realmResponse.data);
                setRealm(realmResponse.data);

                // Debug members array
                console.log('Members array:', realmResponse.data.members);
                console.log('Members array type:', typeof realmResponse.data.members);

                // Fetch member details
                if (realmResponse.data.members && realmResponse.data.members.length > 0) {
                    const memberPromises = realmResponse.data.members.map(memberId => {
                        console.log('Fetching member:', memberId);
                        return axios.get(`${import.meta.env.VITE_BACKEND_URL}/profile/public/${memberId}`, {
                            headers: { Authorization: `Bearer ${token}` },
                        }).catch(error => {
                            console.error(`Failed to fetch member ${memberId}:`, error);
                            return null;
                        });
                    });

                    const memberResults = await Promise.all(memberPromises);
                    const validMembers = memberResults.filter(result => result !== null).map(result => result.data);
                    console.log('Fetched members:', validMembers);
                    setMembers(validMembers);

                    // Fetch member scores
                    if (realmResponse.data.members && realmResponse.data.members.length > 0) {
                        try {
                            const scoresResponse = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/realms/${realmId}/scores`, {
                                headers: { Authorization: `Bearer ${token}` },
                            });
                            console.log('Fetched member scores:', scoresResponse.data);
                            setMemberScores(scoresResponse.data);
                        } catch (scoresError) {
                            console.error('Failed to fetch member scores:', scoresError);
                            // Gracefully handle missing scores, perhaps set to empty or show a specific UI indicator
                            setMemberScores([]);
                        }
                    } else {
                        setMemberScores([]); // No members, so no scores
                    }

                } else {
                    console.log('No members in this realm');
                    setMembers([]);
                    setMemberScores([]); // No members, so no scores
                }
                
                // Fetch membership requests
                const requestsResponse = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/realms/${realmId}/membership-requests`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                console.log('Membership Requests:', requestsResponse.data);
                console.log('User ID:', userId);
                // Check if current user has already requested to join
                if (userId) {
                    setHasRequestedJoin(requestsResponse.data.some(request => 
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
                setMembershipRequests(requestUsers);
                
                // Fetch proposal details
                if (realmResponse.data.proposals && realmResponse.data.proposals.length > 0) {
                    const proposalPromises = realmResponse.data.proposals.map(intentionId =>
                        axios.get(`${import.meta.env.VITE_BACKEND_URL}/intentions/${intentionId}`, {
                            headers: { Authorization: `Bearer ${token}` },
                        })
                    );
                    
                    const proposalResults = await Promise.all(proposalPromises);
                    setProposals(proposalResults.map(result => result.data));
                }
                
                // Fetch approved intentions
                if (realmResponse.data.approved_intentions && realmResponse.data.approved_intentions.length > 0) {
                    const intentionPromises = realmResponse.data.approved_intentions.map(intentionId =>
                        axios.get(`${import.meta.env.VITE_BACKEND_URL}/intentions/${intentionId}`, {
                            headers: { Authorization: `Bearer ${token}` },
                        })
                    );
                    
                    const intentionResults = await Promise.all(intentionPromises);
                    setApprovedIntentions(intentionResults.map(result => result.data));
                }
                
            } catch (error) {
                console.error('Failed to fetch realm data:', error);
                setError('Failed to load realm data. Please try again later.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchRealmData();
    }, [realmId, getAccessTokenSilently, userId]);

    // This is the updated useEffect for delegation status
    useEffect(() => {
        // Check if we have all the necessary data
        if (realm && userId && members.length > 0) {
            // Check if realm has vote_delegations property and if user has delegated their vote
            if (realm.vote_delegations) {
                const userIdStr = String(userId);
                const isDelegatingNow = Object.keys(realm.vote_delegations).includes(userIdStr);
                setIsDelegating(isDelegatingNow);
                
                if (isDelegatingNow) {
                    const delegatedToId = realm.vote_delegations[userIdStr];
                    const delegatedMember = members.find(member => 
                        String(member.id) === String(delegatedToId)
                    );
                    setDelegatedTo(delegatedMember);
                } else {
                    setDelegatedTo(null);
                }
            } else {
                // Reset delegation state if no delegations exist
                setIsDelegating(false);
                setDelegatedTo(null);
            }
        }
    }, [realm, userId, members]); // Dependencies ensure it runs when any of these change

    useEffect(() => {
        if (realm && userId) {
            // Check if userId exists in realm.members array
            // Note: We use String() to ensure type consistency in comparison
            const memberCheck = realm.members.some(memberId =>
                String(memberId) === String(userId)
            );
            setIsMember(memberCheck);
        }
    }, [realm, userId]);

    const handleRequestJoin = async () => {
        try {
            const token = await getAccessTokenSilently({
                audience: import.meta.env.VITE_BACKEND_URL,
                scope: 'openid profile email',
            });

            await axios.post(`${import.meta.env.VITE_BACKEND_URL}/realms/${realmId}/request`,
                { userId },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setHasRequestedJoin(true);
            showNotification('Your request to join has been submitted!');
            
        } catch (error) {
            console.error('Failed to submit join request:', error);
            alert('Failed to submit your join request. Please try again.');
        }
    };

    const handleVoteIntention = async (intentionId, vote) => {
        if (!isMember) return;
        
        try {
            const token = await getAccessTokenSilently({
                audience: 'import.meta.env.VITE_BACKEND_URL',
                scope: 'openid profile email',
            });
    
            // Get the intention name before voting for potential notification
            const intentionBeforeVote = proposals.find(p => p.id === intentionId);
            const intentionName = intentionBeforeVote?.name || "Intention";
    
            // Send vote to server
            const voteResponse = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/realms/${realmId}/vote/${intentionId}`,
                { userId, vote },
                { headers: { Authorization: `Bearer ${token}` } }
            );
    
            // Check if the vote led to consensus (server should return this info)
            const wasRejected = voteResponse.data?.failed;
            const wasApproved = voteResponse.data?.passed;
            
            // Show appropriate message if consensus was reached
            
            if (wasApproved) {
                showNotification(`${intentionName} has been approved by the realm and moved to active intentions!`, 'success');
            } else if (wasRejected) {
                showNotification(`${intentionName} has been rejected by the realm.`);
            }
            
    
            // Refresh the entire realm data after voting
            const realmResponse = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/realms/${realmId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            
            setRealm(realmResponse.data);
    
            // After voting, we need to fully refresh both proposals and approved intentions
            // First, get all current proposals from the API
            if (realmResponse.data.proposals && realmResponse.data.proposals.length > 0) {
                const proposalPromises = realmResponse.data.proposals.map(propId =>
                    axios.get(`${import.meta.env.VITE_BACKEND_URL}/intentions/${propId}`, {
                        headers: { Authorization: `Bearer ${token}` },
                    })
                );
                
                const proposalResults = await Promise.all(proposalPromises);
                setProposals(proposalResults.map(result => result.data));
            } else {
                // If no proposals are left, set to empty array
                setProposals([]);
            }
            
            // Then get all approved intentions from the API
            if (realmResponse.data.approved_intentions && realmResponse.data.approved_intentions.length > 0) {
                const intentionPromises = realmResponse.data.approved_intentions.map(projId =>
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
            console.error('Failed to vote on intention:', error);
            alert('Failed to submit your vote. Please try again.');
        }
    };

    const handleVoteMember = async (requestUserId, vote) => {
        if (!isMember) return;
        
        try {
            const token = await getAccessTokenSilently({
                audience: 'import.meta.env.VITE_BACKEND_URL',
                scope: 'openid profile email',
            });

            await axios.post(`${import.meta.env.VITE_BACKEND_URL}/realms/${realmId}/vote/member/${requestUserId}`,
                { userId,                  
                 vote },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // Refresh membership requests after voting
            const requestsResponse = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/realms/${realmId}/membership-requests`, {
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
            setMembershipRequests(requestUsers);
            
            // Refresh realm to get updated member list
            const realmResponse = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/realms/${realmId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            
            setRealm(realmResponse.data);
            
        } catch (error) {
            console.error('Failed to vote on membership:', error);
            alert('Failed to submit your vote. Please try again.');
        }
    };

    const handleDelegateVote = async (delegateToUserId) => {
        if (!isMember) return;
        
        try {
            const token = await getAccessTokenSilently({
                audience: 'import.meta.env.VITE_BACKEND_URL',
                scope: 'openid profile email',
            });

            await axios.post(`${import.meta.env.VITE_BACKEND_URL}/realms/${realmId}/delegate/${userId}`,
                { delegateTo: delegateToUserId },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // Update local state with delegation
            setVoteDelegations({
                ...voteDelegations,
                [realmId]: delegateToUserId
            });
            
            // Refresh realm data to get updated vote delegations
            const realmResponse = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/realms/${realmId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            
            setRealm(realmResponse.data);
            
            showNotification('Vote delegation successful!');
            
        } catch (error) {
            console.error('Failed to delegate vote:', error);
            alert('Failed to delegate your vote. Please try again.');
        }
    };

    const handleRevokeVote = async () => {
        if (!isMember) return;
        
        try {
            const token = await getAccessTokenSilently({
                audience: 'import.meta.env.VITE_BACKEND_URL',
                scope: 'openid profile email',
            });

            await axios.post(`${import.meta.env.VITE_BACKEND_URL}/realms/${realmId}/revoke/${userId}`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // Update local state
            const newDelegations = { ...voteDelegations };
            delete newDelegations[realmId];
            setVoteDelegations(newDelegations);
            
            // Refresh realm data to get updated vote delegations
            const realmResponse = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/realms/${realmId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            
            setRealm(realmResponse.data);
            
            showNotification('Vote delegation revoked!');
            
        } catch (error) {
            console.error('Failed to revoke vote delegation:', error);
            alert('Failed to revoke your vote delegation. Please try again.');
        }
    };

    if (isLoading) {
        return <Typography className="loading-container" sx={{ textAlign: 'center', padding: 3 }}>Loading realm data...</Typography>;
    }

    if (error) {
        return <Typography className="error-container" sx={{ textAlign: 'center', padding: 3 }}>{error}</Typography>;
    }

    if (!realm) {
        return <Typography className="error-container" sx={{ textAlign: 'center', padding: 3 }}>Realm not found</Typography>;
    }

    return (
        <div className="realm-hub">
            <Typography variant="h4" className="hub-title">{realm.name}</Typography>
            
            {/* Realm Info Section */}
            <div className="realm-info">
                <Typography variant="body1" className="realm-description">{realm.description}</Typography>
                <div className="tag-container">
                    {realm.interest_tags && realm.interest_tags.map((tag, index) => (
                        <Chip key={index} label={tag} sx={{ /* className='interest-tag' removed, use sx if direct styling needed */ }} />
                    ))}
                </div>
                
                {/* Join Request Button for non-members */}
                {!isMember && (
                    <Box mt={3} display="flex" justifyContent="center">
                        <Paper elevation={3} className="join-request-container" sx={{ padding: 3, maxWidth: 500 }}>
                            <Typography variant="h6" align="center" gutterBottom>
                                You're not a member of this realm yet
                            </Typography>
                            <Typography variant="body2" align="center" paragraph>
                                Join this realm to participate in voting, propose intentions, and connect with other members.
                            </Typography>
                            <Box display="flex" justifyContent="center">
                                {hasRequestedJoin ? (
                                    <Button 
                                        variant="contained" 
                                        color="primary" 
                                        disabled 
                                        startIcon={<PersonAddIcon />}
                                    >
                                        Join Request Pending
                                    </Button>
                                ) : (
                                    <Button 
                                        variant="contained" 
                                        color="primary" 
                                        onClick={handleRequestJoin}
                                        startIcon={<PersonAddIcon />}
                                    >
                                        Request to Join
                                    </Button>
                                )}
                            </Box>
                        </Paper>
                    </Box>
                )}
            </div>
            
            {/* Main Content Grid */}
            <div className="hub-grid">
                {/* Members Card */}
                <div className="hub-grid-item">
                    <Card className="hub-card members-card">
                        <CardContent>
                            <GroupIcon className="hub-icon" />
                            <Typography variant="h5" sx={{ color: 'var(--hud-text-primary)', textShadow: '0 0 5px var(--hud-glow-color)' }}>Members</Typography>
                            
                            {isMember && isDelegating && (
                                <div className="delegation-info">
                                    <Typography variant="body2" sx={{color: 'var(--hud-text-color)'}}>
                                        You've delegated your vote to: <strong style={{color: 'var(--hud-secondary-color)'}}>{delegatedTo?.username || "Unknown member"}</strong>
                                    </Typography>
                                    <Button 
                                        variant="outlined" 
                                        size="small" 
                                        onClick={handleRevokeVote}
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
                                        Revoke Delegation
                                    </Button>
                                </div>
                            )}
                            
                            <List className="member-list" key={`member-list-${realmId}`}>
                                {members.map((member) => (
                                    <ListItem 
                                        key={member.id} 
                                        className="member-entry" // CSS handles base style
                                        sx={{ 
                                            cursor: 'pointer',
                                            '&:hover': {
                                                borderColor: 'var(--hud-primary-color)', // From CSS: rgba(var(--hud-primary-color-rgb), 0.4)
                                            }
                                        }}
                                        onClick={() => navigate(`/profile/public/${member.id}`)}
                                    >
                                        <ListItemAvatar>
                                            <Avatar 
                                                src={`${import.meta.env.VITE_BACKEND_URL}${member.profile_picture}`}
                                                alt={member.name} 
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
                                            primary={member.username} 
                                            secondary={`ID: ${member.id} - Score: ${
                                                memberScores.find(scoreEntry => scoreEntry.id === member.id)?.realmScore || 0
                                            }`} 
                                        />
                                        {isMember && !isDelegating && userId !== member.id && (
                                            <Button 
                                                variant="outlined" 
                                                size="small"
                                                onClick={(e) => {
                                                    e.stopPropagation(); // Prevent ListItem click
                                                    handleDelegateVote(member.id);
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
                                                Delegate
                                            </Button>
                                        )}
                                    </ListItem>
                                ))}
                            </List>
                        </CardContent>
                    </Card>
                </div>
                
                {/* Voting Card - Intentions */}
                {isMember && (
                    <div className="hub-grid-item">
                        <Card className="hub-card voting-card">
                            <CardContent>
                                <HowToVoteIcon className="hub-icon" />
                                <Typography variant="h5" sx={{ color: 'var(--hud-text-primary)', textShadow: '0 0 5px var(--hud-glow-color)' }}>Intention Proposals</Typography>
                                {proposals.length === 0 ? (
                                    <Typography variant="body2" className="no-items" sx={{color: 'var(--hud-text-secondary)'}}>No active proposals</Typography>
                                ) : (
                                    <List className="proposal-list">
                                        {proposals.map((proposal) => (
                                            <ListItem key={proposal.id} className="proposal-entry">
                                                <div className="proposal-content">
                                                    <Link
                                                        component="button"
                                                        variant="h6"
                                                        onClick={() => navigate(`/lotus-map/${proposal.id}`)}
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
                                                    
                                                    <div className="vote-info">
                                                        <Typography variant="body2" sx={{color: 'var(--hud-text-secondary)'}}>
                                                            Current Votes: {
                                                                proposal.community_votes ? 
                                                                Object.values(proposal.community_votes).filter(v => v === true).length : 0
                                                            } Yes / {
                                                                proposal.community_votes ? 
                                                                Object.values(proposal.community_votes).filter(v => v === false).length : 0
                                                            } No
                                                        </Typography>
                                                    </div>
                                                    
                                                    <div className="vote-actions">
                                                        <Tooltip title="Approve">
                                                            <IconButton 
                                                                onClick={() => handleVoteIntention(proposal.id, true)}
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
                                                        <Tooltip title="Reject">
                                                            <IconButton 
                                                                onClick={() => handleVoteIntention(proposal.id, false)}
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
                
                {/* Membership Requests Card - Only for members */}
                {isMember && (
                    <div className="hub-grid-item">
                        <Card className="hub-card membership-card">
                            <CardContent>
                                <PersonAddIcon className="hub-icon" />
                                <Typography variant="h5" sx={{ color: 'var(--hud-text-primary)', textShadow: '0 0 5px var(--hud-glow-color)' }}>Membership Requests</Typography>
                                {membershipRequests.length === 0 ? (
                                    <Typography variant="body2" className="no-items" sx={{color: 'var(--hud-text-secondary)'}}>No pending requests</Typography>
                                ) : (
                                    <List className="request-list">
                                        {membershipRequests.map((request) => (
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
                                                <div className="vote-actions">
                                                    <Tooltip title="Approve">
                                                        <IconButton 
                                                            onClick={() => handleVoteMember(request.user_id, true)}
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
                                                    <Tooltip title="Reject">
                                                        <IconButton 
                                                            onClick={() => handleVoteMember(request.user_id, false)}
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
                <div className={`hub-grid-item ${isMember ? 'wide-item' : 'full-width-item'}`}>
                    <Card className="hub-card intentions-card">
                        <CardContent>
                            <RocketLaunchIcon className="hub-icon" />
                            <Typography variant="h5" sx={{ color: 'var(--hud-text-primary)', textShadow: '0 0 5px var(--hud-glow-color)' }}>Active Intentions</Typography>
                            {approvedIntentions.length === 0 ? (
                                <Typography variant="body2" className="no-items" sx={{color: 'var(--hud-text-secondary)'}}>No active intentions</Typography>
                            ) : (
                                <div className="intentions-grid">
                                    {approvedIntentions.map((intention) => (
                                        <Card key={intention.id} className="intention-card"> {/* CSS handles this card's theme */}
                                            <CardContent>
                                                <Link
                                                    component="button"
                                                    variant="h6"
                                                    onClick={() => navigate(`/lotus-map/${intention.id}`)}
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
                                                    onClick={() => navigate(`/lotus-map/${intention.id}`)}
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
                                                    View Intention
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
            <RealmResourceManagement realmId={realmId} />
            <RealmChronicle realmId={realmId} />
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

export default CommunityHub;