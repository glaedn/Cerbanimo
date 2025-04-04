import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Avatar, Typography, Chip, CircularProgress, Box } from "@mui/material";
import axios from "axios";
import { useAuth0 } from '@auth0/auth0-react';
import "./PublicProfile.css";

const PublicProfile = () => {
  const { userId } = useParams();
  const [profile, setProfile] = useState(null);
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user, getAccessTokenSilently } = useAuth0();
  // Centralized token retrieval method
  const getToken = async () => {
    try {
      return await getAccessTokenSilently({
        audience: 'http://localhost:4000',
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
        const profileResponse = await axios.get(`http://localhost:4000/profile/public/${userId}`);
        
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
            : []
        };
        
        setProfile(parsedProfile);
        
        // Fetch badges from rewards endpoint with auth token
        const token = await getToken();
        if (token) {
          const badgesResponse = await axios.get(`http://localhost:4000/rewards/user/${userId}`, {
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
    <div className="public-profile-container">
      <Avatar 
        src={profile.profile_picture ? `http://localhost:4000${profile.profile_picture}` : "/default-avatar.png"} 
        className="public-profile-avatar"
        sx={{ width: 100, height: 100, marginBottom: 2 }}
      />
      
      <Typography variant="h4" gutterBottom>
        {profile.username}
      </Typography>
      
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
                src={badge.icon ? `http://localhost:4000${badge.icon}` : "/default-badge.png"} 
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