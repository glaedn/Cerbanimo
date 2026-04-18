import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Avatar, Typography, Chip, CircularProgress, Box, Link as MuiLink, Paper } from "@mui/material";
import axios from "axios";
import { useAuth0 } from '@auth0/auth0-react';
import UserPortfolio from "./UserPortfolio.jsx";
import { useIsMobile } from "../hooks/useIsMobile";
import "./PublicProfile.css";
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import { Card, CardContent, Button as MuiButton } from "@mui/material";

const PublicProfile = () => {
  const { userId } = useParams();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [badges, setBadges] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user, getAccessTokenSilently, isAuthenticated } = useAuth0();
  const [currentUserProfile, setCurrentUserProfile] = useState(null);

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

        // Fetch advertised services
        const servicesResponse = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/services/user/${userId}`);
        setServices(servicesResponse.data || []);
        
        // Fetch current user's profile to get their internal ID for purchasing
        if (isAuthenticated) {
            const token = await getToken();
            const currentProfileRes = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/profile`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCurrentUserProfile(currentProfileRes.data);
        }

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
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId, isAuthenticated]);

  const handlePurchaseService = async (service) => {
    if (!currentUserProfile) {
        alert("Please log in to purchase services.");
        return;
    }

    const confirm = window.confirm(`Purchase service "${service.name}" for ${service.service_price} community tokens?`);
    if (!confirm) return;

    try {
        const token = await getToken();
        const response = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/services/${service.id}/purchase`, {
            userId: currentUserProfile.id
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });

        alert("Service purchased successfully! Redirecting to your new project instance.");
        navigate(`/visualizer/${response.data.projectId}`);
    } catch (error) {
        console.error("Purchase failed:", error);
        alert(`Purchase failed: ${error.response?.data?.message || error.message}`);
    }
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

      <UserPortfolio userId={userId} />

      {services.length > 0 && (
        <Box sx={{ my: 4, width: '100%' }}>
          <Typography variant="h5" sx={{ color: '#00F3FF', mb: 2, fontFamily: 'Orbitron' }}>
            Services Offered
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 2 }}>
            {services.map(service => (
              <Card key={service.id} sx={{ bgcolor: 'rgba(28, 28, 30, 0.7)', border: '1px solid #00F3FF', color: 'white' }}>
                <CardContent>
                  <Typography variant="h6" sx={{ color: '#00F3FF' }}>{service.name}</Typography>
                  <Typography variant="body2" sx={{ color: '#CCC', mb: 2, minHeight: '3em' }}>{service.description}</Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6" sx={{ color: '#FF5CA2' }}>{service.service_price} Tokens</Typography>
                    <MuiButton
                        variant="contained"
                        startIcon={<ShoppingCartIcon />}
                        onClick={() => handlePurchaseService(service)}
                        sx={{ background: 'linear-gradient(45deg, #00F3FF, #4DABF7)', color: 'black' }}
                    >
                        Purchase
                    </MuiButton>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        </Box>
      )}

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