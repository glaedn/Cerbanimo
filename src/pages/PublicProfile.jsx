import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Avatar, Typography, Chip, CircularProgress, Box, Link as MuiLink, Paper } from "@mui/material";
import axios from "axios";
import { useAuth0 } from '@auth0/auth0-react';
import UserPortfolio from "./UserPortfolio.jsx";
import { useIsMobile } from "../hooks/useIsMobile";
import "./PublicProfile.css";

const PublicProfile = () => {
  const { userId } = useParams();
  const isMobile = useIsMobile();
  const [profile, setProfile] = useState(null);
  const [badges, setBadges] = useState([]);
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

        <Box sx={{ mt: 3, textAlign: 'left' }}>
            <Typography variant="overline" sx={{ color: '#888', display: 'block', mb: 1 }}>SKILL SET</Typography>
            <Box className="skills-container-hud" sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {renderChips(profile.skills)}
            </Box>
        </Box>

        <Box sx={{ mt: 3, textAlign: 'left' }}>
            <Typography variant="overline" sx={{ color: '#888', display: 'block', mb: 1 }}>AREAS OF INTEREST</Typography>
            <Box className="skills-container-hud" sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {renderChips(profile.interests)}
            </Box>
        </Box>
      </Box>

      <Box sx={{ width: isMobile ? '100%' : '800px', mb: 4 }}>
        <Typography variant="h6" sx={{ fontFamily: 'Orbitron', color: '#00f3ff', mb: 2, borderBottom: '1px solid #00f3ff', pb: 1 }}>CHRONICLE PORTFOLIO</Typography>
        <UserPortfolio userId={userId} />
      </Box>
      
      <Box sx={{ width: isMobile ? '100%' : '800px', mb: 4 }}>
        <Typography variant="h6" sx={{ fontFamily: 'Orbitron', color: '#ff5ca2', mb: 2, borderBottom: '1px solid #ff5ca2', pb: 1 }}>ACQUIRED BADGES</Typography>
        <div className="badges-container-hud" style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: isMobile ? 'center' : 'flex-start' }}>
            {badges.length > 0 ? (
            badges.map((badge, index) => (
                <Box key={`badge-${badge.id || index}`} sx={{ textAlign: 'center', width: '80px' }}>
                <Avatar
                    src={badge.icon ? badge.icon : "/default-badge.png"}
                    alt={badge.name}
                    className="badge-avatar-hud"
                    sx={{
                        width: 60,
                        height: 60,
                        margin: '0 auto 8px',
                        border: '1px solid #ff5ca2',
                        bgcolor: 'rgba(255, 92, 162, 0.1)'
                    }}
                    imgProps={{
                    onError: (e) => {
                        e.target.onerror = null;
                        e.target.src = "/default-badge.png";
                    }
                    }}
                />
                <Typography variant="caption" sx={{ fontFamily: 'Orbitron', color: '#eee', fontSize: '0.6rem', display: 'block' }}>
                    {badge.name.toUpperCase()}
                </Typography>
                </Box>
            ))
            ) : (
            <Typography variant="body2" sx={{ color: '#888' }}>NO BADGES DETECTED</Typography>
            )}
        </div>
      </Box>
    </div>
  );
};

export default PublicProfile;