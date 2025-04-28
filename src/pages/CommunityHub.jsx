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
  Tooltip
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

import './CommunityHub.css';

const CommunityHub = () => {
    const { communityId } = useParams();
    const { user, isAuthenticated, getAccessTokenSilently } = useAuth0();
    const navigate = useNavigate();
    
    const [community, setCommunity] = useState(null);
    const [members, setMembers] = useState([]);
    const [membershipRequests, setMembershipRequests] = useState([]);
    const [proposals, setProposals] = useState([]);
    const [approvedProjects, setApprovedProjects] = useState([]);
    const [userId, setUserId] = useState(null);
    const [voteDelegations, setVoteDelegations] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchUserProfile = async () => {
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
        const fetchCommunityData = async () => {
            if (!communityId) return;
            
            try {
                setIsLoading(true);
                const token = await getAccessTokenSilently({
                    audience: 'http://localhost:4000',
                    scope: 'openid profile email',
                });

                // Fetch community details
                const communityResponse = await axios.get(`http://localhost:4000/communities/${communityId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                
                setCommunity(communityResponse.data);
                
                // Fetch member details
                const memberPromises = communityResponse.data.members.map(memberId => 
                    axios.get(`http://localhost:4000/profile/public/${memberId}`, {
                        headers: { Authorization: `Bearer ${token}` },
                    })
                );
                
                const memberResults = await Promise.all(memberPromises);
                setMembers(memberResults.map(result => result.data));
                
                // Fetch membership requests
                const requestsResponse = await axios.get(`http://localhost:4000/communities/${communityId}/membership-requests`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                
                // Fetch user data for each request
                const requestUserPromises = requestsResponse.data.map(request => 
                    axios.get(`http://localhost:4000/profile/public/${request.user_id}`, {
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
                        axios.get(`http://localhost:4000/projects/${projectId}`, {
                            headers: { Authorization: `Bearer ${token}` },
                        })
                    );
                    
                    const proposalResults = await Promise.all(proposalPromises);
                    setProposals(proposalResults.map(result => result.data));
                }
                
                // Fetch approved projects
                if (communityResponse.data.approved_projects && communityResponse.data.approved_projects.length > 0) {
                    const projectPromises = communityResponse.data.approved_projects.map(projectId => 
                        axios.get(`http://localhost:4000/projects/${projectId}`, {
                            headers: { Authorization: `Bearer ${token}` },
                        })
                    );
                    
                    const projectResults = await Promise.all(projectPromises);
                    setApprovedProjects(projectResults.map(result => result.data));
                }
                
            } catch (error) {
                console.error('Failed to fetch community data:', error);
                setError('Failed to load community data. Please try again later.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchCommunityData();
    }, [communityId, getAccessTokenSilently]);

    const handleVoteProject = async (projectId, vote) => {
        try {
            const token = await getAccessTokenSilently({
                audience: 'http://localhost:4000',
                scope: 'openid profile email',
            });

            await axios.post(`http://localhost:4000/communities/${communityId}/vote/${projectId}`, 
                { userId, vote },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // Refresh proposals after voting
            const updatedProposalResponse = await axios.get(`http://localhost:4000/projects/${projectId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            
            setProposals(prevProposals => 
                prevProposals.map(proposal => 
                    proposal.id === projectId ? updatedProposalResponse.data : proposal
                )
            );
            
        } catch (error) {
            console.error('Failed to vote on project:', error);
            alert('Failed to submit your vote. Please try again.');
        }
    };

    const handleVoteMember = async (requestUserId, vote) => {
        try {
            const token = await getAccessTokenSilently({
                audience: 'http://localhost:4000',
                scope: 'openid profile email',
            });

            await axios.post(`http://localhost:4000/communities/${communityId}/vote/member/${requestUserId}`, 
                { vote },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // Refresh membership requests after voting
            const requestsResponse = await axios.get(`http://localhost:4000/communities/${communityId}/membership-requests`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            
            // Fetch user data for each request
            const requestUserPromises = requestsResponse.data.map(request => 
                axios.get(`http://localhost:4000/profile/public/${request.user_id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                }).then(userResponse => ({
                    ...request,
                    userData: userResponse.data
                }))
            );
            
            const requestUsers = await Promise.all(requestUserPromises);
            setMembershipRequests(requestUsers);
            
            // Refresh community to get updated member list
            const communityResponse = await axios.get(`http://localhost:4000/communities/${communityId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            
            setCommunity(communityResponse.data);
            
        } catch (error) {
            console.error('Failed to vote on membership:', error);
            alert('Failed to submit your vote. Please try again.');
        }
    };

    const handleDelegateVote = async (delegateToUserId) => {
        try {
            const token = await getAccessTokenSilently({
                audience: 'http://localhost:4000',
                scope: 'openid profile email',
            });

            await axios.post(`http://localhost:4000/communities/${communityId}/delegate/${userId}`, 
                { delegateTo: delegateToUserId },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // Update local state
            setVoteDelegations({
                ...voteDelegations,
                [communityId]: delegateToUserId
            });
            
            alert('Vote delegation successful!');
            
        } catch (error) {
            console.error('Failed to delegate vote:', error);
            alert('Failed to delegate your vote. Please try again.');
        }
    };

    const handleRevokeVote = async () => {
        try {
            const token = await getAccessTokenSilently({
                audience: 'http://localhost:4000',
                scope: 'openid profile email',
            });

            await axios.post(`http://localhost:4000/communities/${communityId}/revoke/${userId}`, 
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // Update local state
            const newDelegations = { ...voteDelegations };
            delete newDelegations[communityId];
            setVoteDelegations(newDelegations);
            
            alert('Vote delegation revoked!');
            
        } catch (error) {
            console.error('Failed to revoke vote delegation:', error);
            alert('Failed to revoke your vote delegation. Please try again.');
        }
    };

    if (isLoading) {
        return <div className="loading-container">Loading community data...</div>;
    }

    if (error) {
        return <div className="error-container">{error}</div>;
    }

    if (!community) {
        return <div className="error-container">Community not found</div>;
    }

    const isDelegating = voteDelegations && voteDelegations[communityId];
    const delegatedTo = members.find(member => member.id === voteDelegations[communityId]);

    return (
        <div className="community-hub">
            <Typography variant="h4" className="hub-title">{community.name}</Typography>
            
            {/* Community Info Section */}
            <div className="community-info">
                <Typography variant="body1" className="community-description">{community.description}</Typography>
                <div className="tag-container">
                    {community.interest_tags && community.interest_tags.map((tag, index) => (
                        <Chip key={index} label={tag} className="interest-tag" />
                    ))}
                </div>
            </div>
            
            {/* Main Content Grid */}
            <div className="hub-grid">
                {/* Members Card */}
                <div className="hub-grid-item">
                    <Card className="hub-card members-card">
                        <CardContent>
                            <GroupIcon className="hub-icon" />
                            <Typography variant="h5">Members</Typography>
                            
                            {isDelegating && (
                                <div className="delegation-info">
                                    <Typography variant="body2">
                                        You've delegated your vote to: <strong>{delegatedTo?.name || "Unknown member"}</strong>
                                    </Typography>
                                    <Button 
                                        variant="outlined" 
                                        color="secondary" 
                                        size="small" 
                                        onClick={handleRevokeVote}
                                        className="revoke-button"
                                    >
                                        Revoke Delegation
                                    </Button>
                                </div>
                            )}
                            
                            <List className="member-list" key={`member-list-${communityId}`}>
                                {members.map((member) => (
                                    <ListItem 
                                        key={member.id} 
                                        className="member-entry"
                                        sx={{ cursor: 'pointer' }}
                                        onClick={() => navigate(`/profile/public/${member.id}`)}
                                    >
                                        <ListItemAvatar>
                                            <Avatar src={`http://localhost:4000${member.avatar}`} alt={member.name} />
                                        </ListItemAvatar>
                                        <ListItemText 
                                            primary={member.name} 
                                            secondary={`ID: ${member.id}`} 
                                        />
                                        {!isDelegating && userId !== member.id && (
                                            <Button 
                                                variant="contained" 
                                                color="primary" 
                                                size="small"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDelegateVote(member.id);
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
                <div className="hub-grid-item">
                    <Card className="hub-card voting-card">
                        <CardContent>
                            <HowToVoteIcon className="hub-icon" />
                            <Typography variant="h5">Project Proposals</Typography>
                            {proposals.length === 0 ? (
                                <Typography variant="body2" className="no-items">No active proposals</Typography>
                            ) : (
                                <List className="proposal-list">
                                    {proposals.map((proposal) => (
                                        <ListItem key={proposal.id} className="proposal-entry">
                                            <div className="proposal-content">
                                                <Typography 
                                                    variant="h6" 
                                                    className="clickable-title"
                                                    onClick={() => navigate(`/visualizer/${proposal.id}`)}
                                                >
                                                    {proposal.name}
                                                </Typography>
                                                <Typography variant="body2" className="proposal-description">
                                                    {proposal.description}
                                                </Typography>
                                                <div className="tag-container small-tags">
                                                    {proposal.tags && proposal.tags.map((tag, idx) => (
                                                        <Chip key={idx} label={tag} size="small" className="project-tag" />
                                                    ))}
                                                </div>
                                                
                                                <div className="vote-info">
                                                    <Typography variant="body2">
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
                                                            color="success" 
                                                            onClick={() => handleVoteProject(proposal.id, true)}
                                                        >
                                                            <CheckCircleIcon />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Reject">
                                                        <IconButton 
                                                            color="error" 
                                                            onClick={() => handleVoteProject(proposal.id, false)}
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
                
                {/* Membership Requests Card */}
                <div className="hub-grid-item">
                    <Card className="hub-card membership-card">
                        <CardContent>
                            <PersonAddIcon className="hub-icon" />
                            <Typography variant="h5">Membership Requests</Typography>
                            {membershipRequests.length === 0 ? (
                                <Typography variant="body2" className="no-items">No pending requests</Typography>
                            ) : (
                                <List className="request-list">
                                    {membershipRequests.map((request) => (
                                        <ListItem key={request.user_id} className="request-entry">
                                            <ListItemAvatar>
                                                <Avatar 
                                                    src={`http://localhost:4000${request.userData.avatar}`} 
                                                    alt={request.userData.name} 
                                                    onClick={() => navigate(`/profile/public/${request.user_id}`)}
                                                    className="clickable-avatar"
                                                />
                                            </ListItemAvatar>
                                            <ListItemText 
                                                primary={
                                                    <span 
                                                        className="clickable-name"
                                                        onClick={() => navigate(`/profile/public/${request.user_id}`)}
                                                    >
                                                        {request.userData.name}
                                                    </span>
                                                } 
                                                secondary={`ID: ${request.user_id}`} 
                                            />
                                            <div className="vote-actions">
                                                <Tooltip title="Approve">
                                                    <IconButton 
                                                        color="success" 
                                                        onClick={() => handleVoteMember(request.user_id, true)}
                                                    >
                                                        <CheckCircleIcon />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Reject">
                                                    <IconButton 
                                                        color="error" 
                                                        onClick={() => handleVoteMember(request.user_id, false)}
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
                
                {/* Active Projects Card */}
                <div className="hub-grid-item wide-item">
                    <Card className="hub-card projects-card">
                        <CardContent>
                            <RocketLaunchIcon className="hub-icon" />
                            <Typography variant="h5">Active Projects</Typography>
                            {approvedProjects.length === 0 ? (
                                <Typography variant="body2" className="no-items">No active projects</Typography>
                            ) : (
                                <div className="projects-grid">
                                    {approvedProjects.map((project) => (
                                        <Card key={project.id} className="project-card">
                                            <CardContent>
                                                <Typography 
                                                    variant="h6" 
                                                    className="clickable-title"
                                                    onClick={() => navigate(`/visualizer/${project.id}`)}
                                                >
                                                    {project.name}
                                                </Typography>
                                                <Typography variant="body2" className="project-description">
                                                    {project.description}
                                                </Typography>
                                                <div className="tag-container small-tags">
                                                    {project.tags && project.tags.map((tag, idx) => (
                                                        <Chip key={idx} label={tag} size="small" className="project-tag" />
                                                    ))}
                                                </div>
                                                <Button 
                                                    variant="outlined" 
                                                    color="primary"
                                                    className="view-project-btn"
                                                    onClick={() => navigate(`/visualizer/${project.id}`)}
                                                >
                                                    View Project
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
        </div>
    );
};

export default CommunityHub;