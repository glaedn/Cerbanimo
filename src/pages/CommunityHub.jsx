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
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import StorefrontIcon from '@mui/icons-material/Storefront';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert from '@mui/material/Alert';
import CommunityChronicle from '../components/CommunityChronicle/index.jsx';
import CommunityResourceManagement from '../components/CommunityResourceManagement/CommunityResourceManagement.jsx';
import './CommunityHub.css';
import CommunityMarketplace from '../components/CommunityMarketplace/CommunityMarketplace.jsx';
import ImpactGraph from '../components/HUD/ImpactGraph/ImpactGraph';
import { useIsMobile } from '../hooks/useIsMobile';

const CommunityHub = () => {
    const isMobile = useIsMobile();
    const { communityId } = useParams();
    const { user, isAuthenticated, getAccessTokenSilently } = useAuth0();
    const navigate = useNavigate();
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState('success');
    const [community, setCommunity] = useState(null);
    const [members, setMembers] = useState([]);
    const [membershipRequests, setMembershipRequests] = useState([]);
    const [constellationInvites, setConstellationInvites] = useState([]);
    const [proposals, setProposals] = useState([]);
    const [approvedProjects, setApprovedProjects] = useState([]);
    const [communityServices, setCommunityServices] = useState([]);
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

    const fetchCommunityData = async (showLoading = true) => {
        if (!communityId || !userId) { if (showLoading) setIsLoading(false); return; }

        try {
            if (showLoading) setIsLoading(true);
            const token = await getAccessTokenSilently({
                audience: import.meta.env.VITE_BACKEND_URL,
                scope: 'openid profile email',
            });

            // Fetch community details
            const communityResponse = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/communities/${communityId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setCommunity(communityResponse.data);

            // Fetch member details
            if (communityResponse.data.members && communityResponse.data.members.length > 0) {
                const memberPromises = communityResponse.data.members.map(memberId => {
                    return axios.get(`${import.meta.env.VITE_BACKEND_URL}/profile/public/${memberId}`, {
                        headers: { Authorization: `Bearer ${token}` },
                    }).catch(() => null);
                });
                
                const memberResults = await Promise.all(memberPromises);
                const validMembers = memberResults.filter(result => result !== null).map(result => result.data);
                setMembers(validMembers);

    // Fetch member scores
    if (communityResponse.data.members && communityResponse.data.members.length > 0) {
        try {
            const scoresResponse = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/communities/${communityId}/scores`, {
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
    console.log('No members in this community');
    setMembers([]);
    setMemberScores([]); // No members, so no scores
}
                
                // Fetch membership requests
                const requestsResponse = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/communities/${communityId}/membership-requests`, {
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
                if (communityResponse.data.proposals && communityResponse.data.proposals.length > 0) {
                    const proposalPromises = communityResponse.data.proposals.map(projectId => 
                        axios.get(`${import.meta.env.VITE_BACKEND_URL}/projects/${projectId}`, {
                            headers: { Authorization: `Bearer ${token}` },
                        })
                    );
                    
                    const proposalResults = await Promise.all(proposalPromises);
                    setProposals(proposalResults.map(result => result.data));
                }
                
                // Fetch approved projects
                if (communityResponse.data.approved_projects && communityResponse.data.approved_projects.length > 0) {
                    const projectPromises = communityResponse.data.approved_projects.map(projectId => 
                        axios.get(`${import.meta.env.VITE_BACKEND_URL}/projects/${projectId}`, {
                            headers: { Authorization: `Bearer ${token}` },
                        })
                    );
                    
                    const projectResults = await Promise.all(projectPromises);
                    setApprovedProjects(projectResults.map(result => result.data));
                }

                // Fetch community services
                const servicesResponse = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/services/community/${communityId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setCommunityServices(servicesResponse.data || []);
                
            } catch (error) {
                console.error('Failed to fetch community data:', error);
                setError('Failed to load community data. Please try again later.');
            } finally {
                setIsLoading(false);
            }
        };

    useEffect(() => {
        fetchCommunityData();
    }, [communityId, getAccessTokenSilently, userId]);

    // This is the updated useEffect for delegation status
    useEffect(() => {
        // Check if we have all the necessary data
        if (community && userId && members.length > 0) {
            // Check if community has vote_delegations property and if user has delegated their vote
            if (community.vote_delegations) {
                const userIdStr = String(userId);
                const isDelegatingNow = Object.keys(community.vote_delegations).includes(userIdStr);
                setIsDelegating(isDelegatingNow);
                
                if (isDelegatingNow) {
                    const delegatedToId = community.vote_delegations[userIdStr];
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
    }, [community, userId, members]); // Dependencies ensure it runs when any of these change

    useEffect(() => {
        if (community && userId) {
            // Check if userId exists in community.members array
            // Note: We use String() to ensure type consistency in comparison
            const memberCheck = community.members.some(memberId => 
                String(memberId) === String(userId)
            );
            setIsMember(memberCheck);
        }
    }, [community, userId]);

    const handleRequestJoin = async () => {
        try {
            const token = await getAccessTokenSilently({
                audience: import.meta.env.VITE_BACKEND_URL,
                scope: 'openid profile email',
            });

            await axios.post(`${import.meta.env.VITE_BACKEND_URL}/communities/${communityId}/request`,
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

    const handleVoteProject = async (projectId, vote) => {
        if (!isMember) return;
        
        try {
            const token = await getAccessTokenSilently({
                audience: 'import.meta.env.VITE_BACKEND_URL',
                scope: 'openid profile email',
            });
    
            // Get the project name before voting for potential notification
            const projectBeforeVote = proposals.find(p => p.id === projectId);
            const projectName = projectBeforeVote?.name || "Project";
    
            // Send vote to server
            const voteResponse = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/communities/${communityId}/vote/${projectId}`,
                { userId, vote },
                { headers: { Authorization: `Bearer ${token}` } }
            );
    
            // Check if the vote led to consensus (server should return this info)
            const wasRejected = voteResponse.data?.failed;
            const wasApproved = voteResponse.data?.passed;
            
            // Show appropriate message if consensus was reached
            
            if (wasApproved) {
                showNotification(`${projectName} has been approved by the community and moved to active projects!`, 'success');
            } else if (wasRejected) {
                showNotification(`${projectName} has been rejected by the community.`);
            }
            
    
            // Refresh the entire community data after voting
            const communityResponse = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/communities/${communityId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            
            setCommunity(communityResponse.data);
    
            // Refresh the entire community data after voting
            await fetchCommunityData(false);
            
        } catch (error) {
            console.error('Failed to vote on project:', error);
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

            await axios.post(`${import.meta.env.VITE_BACKEND_URL}/communities/${communityId}/vote/member/${requestUserId}`,
                { userId,                  
                 vote },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // Refresh membership requests after voting
            const requestsResponse = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/communities/${communityId}/membership-requests`, {
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
            
            // Refresh community to get updated member list
            const communityResponse = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/communities/${communityId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            
            setCommunity(communityResponse.data);
            
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

            await axios.post(`${import.meta.env.VITE_BACKEND_URL}/communities/${communityId}/delegate/${userId}`,
                { delegateTo: delegateToUserId },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // Update local state with delegation
            setVoteDelegations({
                ...voteDelegations,
                [communityId]: delegateToUserId
            });
            
            // Refresh community data to get updated vote delegations
            const communityResponse = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/communities/${communityId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            
            setCommunity(communityResponse.data);
            
            showNotification('Vote delegation successful!');
            
        } catch (error) {
            console.error('Failed to delegate vote:', error);
            alert('Failed to delegate your vote. Please try again.');
        }
    };

    const handleVoteConstellation = async (inviteId, vote) => {
        if (!isMember) return;
        try {
            const token = await getAccessTokenSilently({
                audience: 'import.meta.env.VITE_BACKEND_URL',
                scope: 'openid profile email',
            });
            await axios.post(`${import.meta.env.VITE_BACKEND_URL}/constellations_v2/invites/${inviteId}/vote`,
                { userId, vote, communityId },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            showNotification('Alliance vote recorded.');
            // Refresh invites
            const constellationInvitesRes = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/constellations_v2/invites/community/${communityId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setConstellationInvites(constellationInvitesRes.data);
        } catch (error) {
            console.error('Failed to vote on constellation invite:', error);
            alert('Failed to submit your vote.');
        }
    };

    const handleRevokeVote = async () => {
        if (!isMember) return;
        
        try {
            const token = await getAccessTokenSilently({
                audience: 'import.meta.env.VITE_BACKEND_URL',
                scope: 'openid profile email',
            });

            await axios.post(`${import.meta.env.VITE_BACKEND_URL}/communities/${communityId}/revoke/${userId}`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // Update local state
            const newDelegations = { ...voteDelegations };
            delete newDelegations[communityId];
            setVoteDelegations(newDelegations);
            
            // Refresh community data to get updated vote delegations
            const communityResponse = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/communities/${communityId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            
            setCommunity(communityResponse.data);
            
            showNotification('Vote delegation revoked!');
            
        } catch (error) {
            console.error('Failed to revoke vote delegation:', error);
            alert('Failed to revoke your vote delegation. Please try again.');
        }
    };

    const handlePurchaseService = async (service) => {
        if (!userId) {
            alert("Please log in to purchase services.");
            return;
        }

        const confirm = window.confirm(`Purchase community service "${service.name}" for ${service.service_price} community tokens?`);
        if (!confirm) return;

        try {
            const token = await getAccessTokenSilently();
            const response = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/services/${service.id}/purchase`, {
                userId: userId
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            showNotification("Service purchased successfully! Redirecting to your new project instance.");
            navigate(`/visualizer/${response.data.projectId}`);
        } catch (error) {
            console.error("Purchase failed:", error);
            alert(`Purchase failed: ${error.response?.data?.message || error.message}`);
        }
    };

    if (isLoading) {
        return <Typography className="loading-container" sx={{ textAlign: 'center', padding: 3 }}>Loading community data...</Typography>;
    }

    if (error) {
        return <Typography className="error-container" sx={{ textAlign: 'center', padding: 3 }}>{error}</Typography>;
    }

    if (!community) {
        return <Typography className="error-container" sx={{ textAlign: 'center', padding: 3 }}>Community not found</Typography>;
    }

    return (
        <Box className={`community-hub community-hub-container ${isMobile ? 'mobile-hub' : ''}`} sx={{ pb: isMobile ? 12 : 5 }}>
            <Typography variant={isMobile ? "h4" : "h2"} className="hub-title" sx={{ fontSize: isMobile ? '1.8rem !important' : 'inherit' }}>
                {community.name}
            </Typography>
            
            {/* Community Info Section */}
            <Box className="community-info" sx={{ p: isMobile ? 2 : 4, width: '100%' }}>
                <Box className="impact-mini-atlas" sx={{ mb: 2 }}>
                    <ImpactGraph realmId={communityId} height={isMobile ? "200px" : "300px"} />
                </Box>
                <Typography variant="body1" className="community-description" sx={{ fontSize: isMobile ? '0.9rem' : '1.1rem' }}>
                    {community.description}
                </Typography>
                <Box className="tag-container" sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 1 }}>
                    {community.interest_tags && community.interest_tags.map((tag, index) => (
                        <Chip key={index} label={tag} size={isMobile ? "small" : "medium"} />
                    ))}
                </Box>
                
                {/* Join Request Button for non-members */}
                {!isMember && (
                    <Box mt={3} display="flex" justifyContent="center">
                        <Paper elevation={3} className="join-request-container" sx={{ padding: 3, maxWidth: 500 }}>
                            <Typography variant="h6" align="center" gutterBottom>
                                You're not a member of this community yet
                            </Typography>
                            <Typography variant="body2" align="center" paragraph>
                                Join this community to participate in voting, propose projects, and connect with other members.
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
                                        fullWidth={isMobile}
                                        sx={{ height: isMobile ? '48px' : 'auto' }}
                                    >
                                        Request to Join
                                    </Button>
                                )}
                            </Box>
                        </Paper>
                    </Box>
                )}
            </Box>
            
            {/* Main Content Grid */}
            <Box className="hub-grid" sx={{ px: isMobile ? 0 : 2 }}>
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
                            
                            <List className="member-list" key={`member-list-${communityId}`}>
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
                                                memberScores.find(scoreEntry => scoreEntry.id === member.id)?.communityScore || 0
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
                
                {/* Voting Card - Projects */}
                {isMember && (
                    <div className="hub-grid-item">
                        <Card className="hub-card voting-card">
                            <CardContent>
                                <HowToVoteIcon className="hub-icon" />
                                <Typography variant="h5" sx={{ color: 'var(--hud-text-primary)', textShadow: '0 0 5px var(--hud-glow-color)' }}>Project Proposals</Typography>
                                {proposals.length === 0 ? (
                                    <Typography variant="body2" className="no-items" sx={{color: 'var(--hud-text-secondary)'}}>No active proposals</Typography>
                                ) : (
                                    <List className="proposal-list">
                                        {proposals.map((proposal) => (
                                            <ListItem key={proposal.id} className="proposal-entry">
                                                <div className="proposal-content">
                                                    <Box display="flex" justifyContent="center" alignItems="center" gap={1} mb={1}>
                                                        <Link
                                                            component="button"
                                                            variant="h6"
                                                            onClick={() => navigate(`/visualizer/${proposal.id}`)}
                                                            className="clickable-title" // CSS handles base style
                                                            sx={{
                                                                textAlign: 'center',
                                                                display: 'block', // Ensure it takes full width for centering
                                                                // sx for Link component might need different approach for color if not inheriting
                                                            }}
                                                        >
                                                            {proposal.name}
                                                        </Link>
                                                        {proposal.isShared && <Chip label="SHARED" size="small" sx={{ bgcolor: 'rgba(255, 92, 162, 0.2)', color: '#ff5ca2', fontSize: '0.6rem', height: '20px' }} />}
                                                    </Box>
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
                                                    
                                                    <Box className="vote-actions" sx={{
                                                        display: 'flex',
                                                        flexDirection: isMobile ? 'column' : 'row',
                                                        gap: 1,
                                                        alignItems: isMobile ? 'stretch' : 'center'
                                                    }}>
                                                        <Button
                                                            size="small"
                                                            variant="outlined"
                                                            startIcon={<RocketLaunchIcon />}
                                                            onClick={() => navigate('/constellations', { state: { prefill: { communityId, project: proposal } } })}
                                                            sx={{
                                                                color: '#ff5ca2',
                                                                borderColor: '#ff5ca2',
                                                                height: isMobile ? '48px' : 'auto',
                                                                flexGrow: 1
                                                            }}
                                                        >
                                                            REQUEST CONSTELLATION
                                                        </Button>
                                                        {proposal.isDirect && (
                                                            <Box sx={{ display: 'flex', gap: 1, justifyContent: isMobile ? 'center' : 'flex-start' }}>
                                                                <Tooltip title="Approve">
                                                                    <IconButton
                                                                        onClick={() => handleVoteProject(proposal.id, true)}
                                                                        sx={{
                                                                            color: 'var(--hud-success-color)',
                                                                            minWidth: '44px', minHeight: '44px',
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
                                                                        onClick={() => handleVoteProject(proposal.id, false)}
                                                                        sx={{
                                                                            color: 'var(--hud-error-color)',
                                                                            minWidth: '44px', minHeight: '44px',
                                                                            '&:hover': {
                                                                                backgroundColor: 'rgba(var(--hud-error-color-rgb, 255, 65, 54), 0.1)',
                                                                                boxShadow: '0 0 8px var(--hud-error-color)',
                                                                            }
                                                                        }}
                                                                    >
                                                                        <CancelIcon />
                                                                    </IconButton>
                                                                </Tooltip>
                                                            </Box>
                                                        )}
                                                    </Box>
                                                </div>
                                            </ListItem>
                                        ))}
                                    </List>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}
                
                {/* Constellation Invites Card - Only for members */}
                {isMember && constellationInvites.length > 0 && (
                    <div className="hub-grid-item">
                        <Card className="hub-card constellation-invites-card">
                            <CardContent>
                                <RocketLaunchIcon className="hub-icon" />
                                <Typography variant="h5" sx={{ color: '#ff5ca2', textShadow: '0 0 5px #ff5ca2' }}>Alliance Requests</Typography>
                                <List>
                                    {constellationInvites.map(invite => (
                                        <ListItem key={invite.id} sx={{ borderBottom: '1px solid rgba(255, 92, 162, 0.2)' }}>
                                            <ListItemText
                                                primary={`Invite from ${invite.inviter_name}`}
                                                secondary={`Alliance: ${invite.constellation_name}`}
                                                primaryTypographyProps={{ color: '#ff5ca2' }}
                                                secondaryTypographyProps={{ color: 'gray' }}
                                            />
                                            <Box className="vote-actions" sx={{ display: 'flex', gap: 1 }}>
                                                <Tooltip title="Accept Alliance">
                                                    <IconButton onClick={() => handleVoteConstellation(invite.id, true)} sx={{ color: 'var(--hud-success-color)', minWidth: 44, minHeight: 44 }}><CheckCircleIcon /></IconButton>
                                                </Tooltip>
                                                <Tooltip title="Reject Alliance">
                                                    <IconButton onClick={() => handleVoteConstellation(invite.id, false)} sx={{ color: 'var(--hud-error-color)', minWidth: 44, minHeight: 44 }}><CancelIcon /></IconButton>
                                                </Tooltip>
                                            </Box>
                                        </ListItem>
                                    ))}
                                </List>
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
                                                <Box className="vote-actions" sx={{ display: 'flex', gap: 1 }}>
                                                    <Tooltip title="Approve">
                                                        <IconButton 
                                                            onClick={() => handleVoteMember(request.user_id, true)}
                                                            sx={{ 
                                                                color: 'var(--hud-success-color)', 
                                                                minWidth: 44, minHeight: 44,
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
                                                                minWidth: 44, minHeight: 44,
                                                                '&:hover': { 
                                                                    backgroundColor: 'rgba(var(--hud-error-color-rgb, 255, 65, 54), 0.1)',
                                                                    boxShadow: '0 0 8px var(--hud-error-color)',
                                                                }
                                                            }}
                                                        >
                                                            <CancelIcon />
                                                        </IconButton>
                                                    </Tooltip>
                                                </Box>
                                            </ListItem>
                                        ))}
                                    </List>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}
                {/* Active Projects Card - Visible to all */}
                <div className={`hub-grid-item ${isMember && !isMobile ? 'wide-item' : 'full-width-item'}`}>
                    <Card className="hub-card projects-card">
                        <CardContent sx={{ p: isMobile ? 1.5 : 3 }}>
                            <RocketLaunchIcon className="hub-icon" />
                            <Typography variant="h5" sx={{ color: 'var(--hud-text-primary)', textShadow: '0 0 5px var(--hud-glow-color)', mb: 2 }}>Active Projects</Typography>
                            {approvedProjects.length === 0 ? (
                                <Typography variant="body2" className="no-items" sx={{color: 'var(--hud-text-secondary)'}}>No active projects</Typography>
                            ) : (
                                <div className="projects-grid" style={{ gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                                    {approvedProjects.map((project) => (
                                        <Card key={project.id} className="project-card"> {/* CSS handles this card's theme */}
                                            <CardContent>
                                                <Box display="flex" justifyContent="center" alignItems="center" gap={1} mb={1}>
                                                    <Link
                                                        component="button"
                                                        variant="h6"
                                                        onClick={() => navigate(`/visualizer/${project.id}`)}
                                                        className="clickable-title" // CSS handles base style
                                                        sx={{ textAlign: 'center', display: 'block' }}
                                                    >
                                                        {project.name}
                                                    </Link>
                                                    {project.isShared && <Chip label="SHARED" size="small" sx={{ bgcolor: 'rgba(255, 92, 162, 0.2)', color: '#ff5ca2', fontSize: '0.6rem', height: '20px' }} />}
                                                </Box>
                                                <Typography variant="body2" className="project-description" sx={{color: 'var(--hud-text-secondary)'}}>
                                                    {project.description}
                                                </Typography>
                                                <div className="tag-container small-tags" style={{marginTop: '10px', marginBottom: '10px'}}>
                                                    {project.tags && project.tags.map((tag, idx) => (
                                                        <Chip key={idx} label={tag} size="small" /* sx from CSS */ />
                                                    ))}
                                                </div>
                                                <Box display="flex" flexDirection="column" gap={1} mt="auto">
                                                    <Button
                                                        variant="outlined"
                                                        onClick={() => navigate(`/visualizer/${project.id}`)}
                                                        className="view-project-btn"
                                                        sx={{
                                                            color: 'var(--hud-primary-color)',
                                                            borderColor: 'var(--hud-primary-color)',
                                                            height: isMobile ? '48px' : 'auto',
                                                            '&:hover': {
                                                                backgroundColor: 'rgba(var(--hud-primary-color-rgb), 0.1)',
                                                                borderColor: 'var(--hud-glow-color)',
                                                                boxShadow: '0 0 8px var(--hud-glow-color)',
                                                            }
                                                        }}
                                                    >
                                                        View Project
                                                    </Button>
                                                    <Button
                                                        variant="outlined"
                                                        startIcon={<RocketLaunchIcon />}
                                                        onClick={() => navigate('/constellations', { state: { prefill: { communityId, project } } })}
                                                        sx={{ color: '#ff5ca2', borderColor: '#ff5ca2', height: isMobile ? '48px' : 'auto' }}
                                                    >
                                                        REQUEST CONSTELLATION
                                                    </Button>
                                                </Box>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </Box>
            {/* Community Services Marketplace */}
            <Box sx={{ mt: 4, mb: 4 }}>
                <Card sx={{ bgcolor: 'rgba(28, 28, 30, 0.85)', border: '1px solid #00F3FF', boxShadow: '0 0 15px rgba(0, 243, 255, 0.3)' }}>
                    <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                            <StorefrontIcon sx={{ color: '#00F3FF' }} />
                            <Typography variant="h5" sx={{ color: '#00F3FF', fontFamily: 'Orbitron' }}>Community Services</Typography>
                        </Box>
                        {communityServices.length === 0 ? (
                            <Typography variant="body2" sx={{ color: '#CCC' }}>No services advertised in this community yet.</Typography>
                        ) : (
                            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 2 }}>
                                {communityServices.map(service => (
                                    <Card key={service.id} sx={{ bgcolor: 'rgba(10, 10, 46, 0.6)', border: '1px solid rgba(0, 243, 255, 0.5)', color: 'white' }}>
                                        <CardContent>
                                            <Typography variant="h6" sx={{ color: '#00F3FF' }}>{service.name}</Typography>
                                            <Typography variant="body2" sx={{ color: '#CCC', mb: 2, height: '3em', overflow: 'hidden' }}>{service.description}</Typography>
                                            <Divider sx={{ mb: 2, bgcolor: 'rgba(0, 243, 255, 0.2)' }} />
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Typography variant="h6" sx={{ color: '#FF5CA2' }}>{service.service_price} Tokens</Typography>
                                                <Button
                                                    variant="contained"
                                                    startIcon={<ShoppingCartIcon />}
                                                    onClick={() => handlePurchaseService(service)}
                                                    sx={{
                                                        background: 'linear-gradient(45deg, #00F3FF, #4DABF7)',
                                                        color: 'black',
                                                        '&:hover': { background: 'linear-gradient(45deg, #4DABF7, #00F3FF)' }
                                                    }}
                                                >
                                                    Purchase
                                                </Button>
                                            </Box>
                                        </CardContent>
                                    </Card>
                                ))}
                            </Box>
                        )}
                    </CardContent>
                </Card>
            </Box>

            <CommunityResourceManagement communityId={communityId} />
            <CommunityChronicle communityId={communityId} />
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
        </Box>
    );
};

export default CommunityHub;