import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Avatar, Typography, Chip, CircularProgress, Box, Link as MuiLink } from "@mui/material";
import axios from "axios";
import { useAuth0 } from '@auth0/auth0-react';
import UserPortfolio from "./UserPortfolio.jsx";
import { useIsMobile } from "../hooks/useIsMobile";
import "./PublicProfile.css";
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import { toast } from "react-hot-toast";

const PublicProfile = () => {
  const { userId } = useParams();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [badges, setBadges] = useState([]);
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user, getAccessTokenSilently, isAuthenticated } = useAuth0();
  // Centralized token retrieval method
  const getToken = async () => {
    try {
      return await getAccessTokenSilently({
        audience: import.meta.env.VITE_BACKEND_URL,
        scope: 'openid profile email read:write:profile'
      });
    } catch (error) {
      console.error('Failed to get token:', error);
      throw error;
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch basic profile data
        const profileResponse = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/profile/public/${userId}`);
        
        // Safely parse profile data
        const parsedProfile = {
          ...profileResponse.data,
          skills: Array.isArray(profileResponse.data.skills) 
            ? profileResponse.data.skills.map(skill => {
                if (typeof skill === 'string') {
                  try {
                    const parsed = JSON.parse(skill);
                    return typeof parsed === 'object' ? parsed : { name: skill };
                  } catch {
                    return { name: skill };
                  }
                }
                return skill;
              })
            : [],
          interests: Array.isArray(profileResponse.data.interests)
            ? profileResponse.data.interests.map(interest => {
                if (typeof interest === 'string') {
                  try {
                    const parsed = JSON.parse(interest);
                    return typeof parsed === 'object' ? parsed : { name: interest };
                  } catch {
                    return { name: interest };
                  }
                }
                return interest;
              })
            : [],
          contact_links: Array.isArray(profileResponse.data.contact_links)
            ? profileResponse.data.contact_links
            : []
        };
        
        setProfile(parsedProfile);
        
        // Fetch badges from rewards endpoint with auth token
        const token = await getToken();
        if (token) {
          const badgesResponse = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/rewards/user/${userId}`, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          
          setBadges(badgesResponse.data.badges || []);
        }

        // Fetch communities for this user (separate try-catch to avoid breaking the whole page)
        try {
          const token = await getToken();
          if (token) {
            const communitiesResponse = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/communities/user/${userId}`, {
              headers: {
                Authorization: `Bearer ${token}`
              }
            });
            setCommunities(communitiesResponse.data || []);
          }
        } catch (commErr) {
          console.error("Error fetching user communities:", commErr);
          // Don't set global error, just leave communities empty
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId, isAuthenticated]);

  const handlePurchaseService = async (service, e) => {
    if (e) e.stopPropagation();

    if (!isAuthenticated) {
        toast.error("Please log in to purchase services.");
        return;
    }

    toast((t) => (
      <Box sx={{ p: 1 }}>
        <Typography variant="body1" sx={{ mb: 2, fontFamily: 'Orbitron' }}>
          Purchase service "{service.name}" for {service.service_price} community tokens?
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button
            size="small"
            onClick={() => toast.dismiss(t.id)}
            sx={{ color: '#ff5ca2', fontFamily: 'Orbitron' }}
          >
            ABORT
          </Button>
          <Button
            size="small"
            variant="contained"
            onClick={async () => {
              toast.dismiss(t.id);
              const loadingToast = toast.loading("Initializing purchase...", {
                style: { border: '1px solid #00f3ff' }
              });
              try {
                const token = await getToken();
                const response = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/services/${service.id}/purchase`, {}, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                toast.success("Service acquired! Redirecting...", { id: loadingToast });
                setTimeout(() => navigate(`/Visualizer/${response.data.projectId}`), 1500);
              } catch (error) {
                console.error("Purchase failed:", error);
                toast.error(`Purchase failed: ${error.response?.data?.message || error.message}`, { id: loadingToast });
              }
            }}
            sx={{
              background: 'linear-gradient(45deg, #00f3ff, #4DABF7)',
              color: 'black',
              fontWeight: 'bold',
              fontFamily: 'Orbitron'
            }}
          >
            CONFIRM
          </Button>
        </Box>
      </Box>
    ), {
      duration: 6000,
      style: { minWidth: '350px' }
    });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Typography color="error" variant="h6">
        Error: {error}
      </Typography>
    );
  }

  if (!profile) {
    return <Typography variant="h6">User not found</Typography>;
  }

  // Helper function to render chips with unique keys
  const renderChips = (items) => {
    if (!items || !Array.isArray(items)) return null;
    
    return items
      .filter(item => item && item.name) // Filter out invalid items
      .flatMap((item, index) => {
        // Handle comma-separated values
        if (item.name.includes(',')) {
          return item.name.split(',')
            .map(part => part.trim())
            .filter(part => part) // Remove empty strings
            .map((part, partIndex) => (
              <Chip 
                key={`${index}-${partIndex}-${part}`} // Create truly unique keys
                label={part}
                className="profile-skill-chip"
                sx={{ margin: 0.5 }}
              />
            ));
        }
        return (
          <Chip
            key={`${index}-${item.name}`} // Create unique keys using index and name
            label={item.name}
            className="profile-skill-chip"
            sx={{ margin: 0.5 }}
          />
        );
      });
  };

  return (
    <div className={`public-profile-container ${isMobile ? 'mobile-profile' : ''}`}>
      <Box className="profile-id-card cyber-panel" sx={{ width: isMobile ? '100%' : '600px', p: 3, mb: 4, textAlign: 'center' }}>
        <Typography variant="overline" sx={{ color: '#00f3ff', letterSpacing: 4, mb: 2, display: 'block' }}>OPERATIVE IDENTIFICATION</Typography>
        <Avatar
            src={profile.profile_picture ? profile.profile_picture : "/default-avatar.png"}
            className="public-profile-avatar"
            sx={{
                width: 120,
                height: 120,
                margin: '0 auto 20px',
                border: '2px solid #ff5ca2',
                boxShadow: '0 0 15px rgba(255, 92, 162, 0.5)'
            }}
        />

        <Typography variant="h4" sx={{ fontFamily: 'Orbitron', color: '#00f3ff', textShadow: '0 0 10px #00f3ff', mb: 1 }}>
            {profile.username.toUpperCase()}
        </Typography>

        <Button
          variant="outlined"
          onClick={() => navigate(`/profile/skill-constellation/${userId}`)}
          sx={{
            borderColor: '#00D787',
            color: '#00D787',
            fontFamily: 'Orbitron',
            mt: 2,
            mb: 1,
            boxShadow: '0 0 10px rgba(0, 215, 135, 0.3)',
            '&:hover': {
              borderColor: '#00f3ff',
              color: '#00f3ff',
              backgroundColor: 'rgba(0, 215, 135, 0.1)',
              boxShadow: '0 0 15px rgba(0, 215, 135, 0.5)',
            }
          }}
        >
          SKILL_CONSTELLATION
        </Button>

        {/* Contact Links Section */}
        {profile.contact_links && profile.contact_links.filter(link => link && link.trim() !== '').length > 0 && (
            <Box sx={{ my: 2, p: 1, bgcolor: 'rgba(0,0,0,0.3)', borderRadius: 1 }}>
            {profile.contact_links.filter(link => link && link.trim() !== '').map((link, index) => {
                const href = (link.startsWith('http://') || link.startsWith('https://')) ? link : `http://${link}`;
                return (
                <Typography key={index} sx={{ mb: 0.5 }}>
                    <MuiLink href={href} target="_blank" rel="noopener noreferrer" sx={{ color: '#ff5ca2', fontFamily: 'Orbitron', fontSize: '0.8rem', wordBreak: 'break-all' }}>
                    {link.toUpperCase()}
                    </MuiLink>
                </Typography>
                );
            })}
            </Box>
        )}
      </Box>

      <Box sx={{ width: '100%', my: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', px: isMobile ? 2 : 0 }}>
        <Typography variant="h5" gutterBottom sx={{ fontFamily: 'Orbitron', color: '#00f3ff', mb: 3 }}>
          SERVICES_OFFERED
        </Typography>
        {services && services.length > 0 ? (
          <Grid container spacing={2} sx={{ maxWidth: '800px' }}>
            {services.map((service) => (
              <Grid item xs={12} sm={6} key={service.id}>
                <Card
                  onClick={(e) => handlePurchaseService(service, e)}
                  sx={{
                    bgcolor: 'rgba(28, 28, 30, 0.85)',
                    border: '1px solid #00f3ff',
                    color: 'white',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 0 10px rgba(0, 243, 255, 0.2)',
                    cursor: 'pointer',
                    '&:hover': {
                      boxShadow: '0 0 15px rgba(0, 243, 255, 0.4)',
                      borderColor: '#ff5ca2'
                    }
                  }}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" sx={{ color: '#00f3ff', fontFamily: 'Orbitron', mb: 1 }}>{service.name}</Typography>
                    <Typography variant="body2" sx={{ mb: 2, color: 'rgba(255,255,255,0.7)', height: '3em', overflow: 'hidden' }}>{service.description}</Typography>
                    <Typography variant="h6" sx={{ color: '#ff5ca2', fontFamily: 'Orbitron' }}>
                      {service.service_price} CREDITS
                    </Typography>
                  </CardContent>
                  <CardActions sx={{ p: 2, pt: 0 }}>
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={(e) => handlePurchaseService(service, e)}
                      sx={{
                        background: 'linear-gradient(45deg, #00f3ff, #ff5ca2)',
                        color: 'black',
                        fontWeight: 'bold',
                        fontFamily: 'Orbitron',
                        '&:hover': {
                          background: 'linear-gradient(45deg, #ff5ca2, #00f3ff)',
                        }
                      }}
                    >
                      PURCHASE
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'Orbitron' }}>
            NO_SERVICES_OFFERED_BY_THIS_OPERATIVE_YET
          </Typography>
        )}
      </Box>

      <UserPortfolio userId={userId} />

      <Typography variant="h6" gutterBottom>
        Skills:
      </Typography>
      <div className="skills-container">
        {renderChips(profile.skills)}
      </div>
      
      <Typography variant="h6" gutterBottom>
        Interests:
      </Typography>
      <div className="skills-container">
        {renderChips(profile.interests)}
      </div>
      
      <Typography variant="h6" gutterBottom>
        Realms:
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
        {communities.length > 0 ? (
          communities.map((community) => (
            <Chip
              key={`community-${community.id}`}
              label={community.name}
              onClick={() => navigate(`/communityhub/${community.id}`)}
              sx={{
                backgroundColor: 'rgba(0, 243, 255, 0.1)',
                color: '#00F3FF',
                border: '1px solid #00F3FF',
                '&:hover': {
                  backgroundColor: 'rgba(0, 243, 255, 0.2)',
                  boxShadow: '0 0 10px rgba(0, 243, 255, 0.5)'
                },
                fontFamily: 'Orbitron, sans-serif'
              }}
            />
          ))
        ) : (
          <Typography variant="body2" sx={{ color: '#888' }}>No realms joined yet</Typography>
        )}
      </Box>

      <Typography variant="h6" gutterBottom>
        Badges:
      </Typography>
      <div className="badges-container">
        {badges.length > 0 ? (
          badges.map((badge, index) => (
            <div key={`badge-${badge.id || index}`} className="badge-item">
              <Avatar 
                src={badge.icon ? badge.icon : "/default-badge.png"}
                alt={badge.name}
                className="badge-avatar"
                sx={{ width: 50, height: 50 }}
                imgProps={{
                  onError: (e) => {
                    e.target.onerror = null;
                    e.target.src = "/default-badge.png";
                  }
                }}
              />
              <Typography variant="caption" display="block">
                {badge.name}
              </Typography>
            </div>
          ))
        ) : (
          <Typography variant="body2">No badges available</Typography>
        )}
      </div>
    </div>
  );
};

export default PublicProfile;