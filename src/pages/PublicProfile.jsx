import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Avatar, Typography, Chip, CircularProgress, Box, Link as MuiLink, Card, CardContent, CardActions, Button, Grid } from "@mui/material";
import axios from "axios";
import { useAuth0 } from '@auth0/auth0-react';
import UserPortfolio from "./UserPortfolio.jsx";
import "./PublicProfile.css";

const PublicProfile = () => {
  const { userId } = useParams();
  const [profile, setProfile] = useState(null);
  const [badges, setBadges] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user, getAccessTokenSilently } = useAuth0();
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

          // Fetch services
          const servicesResponse = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/projects/userprojects`, {
            params: { userId: userId }
          });
          const userServices = servicesResponse.data.filter(p => p.is_service && p.service_visibility?.includes('profile'));
          setServices(userServices);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);

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

  const handlePurchaseService = async (serviceId) => {
    try {
      const token = await getToken();
      const response = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/services/${serviceId}/purchase`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Service purchased successfully! New project created.');
      // Optionally redirect to the new project
      // window.location.href = `/project/${response.data.projectId}`;
    } catch (err) {
      console.error('Purchase failed:', err);
      alert(err.response?.data?.message || 'Failed to purchase service');
    }
  };

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
    <div className="public-profile-container">
      <Avatar 
        src={profile.profile_picture ? profile.profile_picture : "/default-avatar.png"}
        className="public-profile-avatar"
        sx={{ width: 100, height: 100, marginBottom: 2 }}
      />
      
      <Typography variant="h4" gutterBottom>
        {profile.username}
      </Typography>

      {/* Contact Links Section */}
      {profile.contact_links && profile.contact_links.filter(link => link && link.trim() !== '').length > 0 && (
        <Box sx={{ my: 2 }}>
          <Typography variant="h6" gutterBottom>
            Contact:
          </Typography>
          {profile.contact_links.filter(link => link && link.trim() !== '').map((link, index) => {
            const href = (link.startsWith('http://') || link.startsWith('https://')) ? link : `http://${link}`;
            return (
              <Typography key={index} sx={{ mb: 0.5 }}>
                <MuiLink href={href} target="_blank" rel="noopener noreferrer" sx={{ wordBreak: 'break-all' }}>
                  {link}
                </MuiLink>
              </Typography>
            );
          })}
        </Box>
      )}

      <UserPortfolio userId={userId} />
      {services.length > 0 && (
        <Box sx={{ width: '100%', my: 4 }}>
          <Typography variant="h5" gutterBottom sx={{ fontFamily: 'Orbitron', color: '#00f3ff' }}>
            Services Offered:
          </Typography>
          <Grid container spacing={2}>
            {services.map((service) => (
              <Grid item xs={12} sm={6} key={service.id}>
                <Card sx={{ bgcolor: '#1a1a1a', border: '1px solid #333', color: 'white' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ color: '#00f3ff' }}>{service.name}</Typography>
                    <Typography variant="body2" sx={{ mb: 2 }}>{service.description}</Typography>
                    <Typography variant="h6" sx={{ color: '#ff00ff' }}>
                      {service.service_price} Credits
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => handlePurchaseService(service.id)}
                      sx={{
                        background: 'linear-gradient(45deg, #ff00ff, #00f3ff)',
                        color: 'black',
                        fontWeight: 'bold'
                      }}
                    >
                      Purchase Service
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
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