import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Avatar, Typography, Chip, CircularProgress } from "@mui/material";
import axios from "axios";
import "./PublicProfile.css";

const PublicProfile = () => {
  const { userId } = useParams(); // Get user ID from URL
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPublicProfile = async () => {
      try {
        const response = await axios.get(`http://localhost:4000/profile/public/${userId}`);
        
        // Parse skills and interests if they are stored as strings
        const parsedProfile = {
          ...response.data,
          skills: response.data.skills.map(skill => {
            // Check if the skill is already an object or a string that needs parsing
            if (typeof skill === 'string') {
              try {
                return JSON.parse(skill);
              } catch (e) {
                return { name: skill };
              }
            }
            return skill;
          }),
          interests: response.data.interests.map(interest => {
            // Check if the interest is already an object or a string that needs parsing
            if (typeof interest === 'string') {
              try {
                return JSON.parse(interest);
              } catch (e) {
                return { name: interest };
              }
            }
            return interest;
          })
        };
        
        setProfile(parsedProfile);
      } catch (error) {
        console.error("Error fetching public profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPublicProfile();
  }, [userId]);

  if (loading) return <CircularProgress />;
  if (!profile) return <Typography variant="h6">User not found</Typography>;

  return (
    <div className="public-profile-container">
      <Avatar 
        src={profile.profile_picture ? `http://localhost:4000${profile.profile_picture}` : "/default-avatar.png"} 
        className="public-profile-avatar"
      />
      <Typography variant="h4">{profile.username}</Typography>
      <Typography variant="body1">Skills:</Typography>
      <div className="skills-container">
        {profile.skills.map((skill, index) => (
          <Chip 
            key={skill.id || index} 
            label={skill.name} 
            className="profile-skill-chip" 
          />
        ))}
      </div>
      <Typography variant="body1">Interests:</Typography>
      <div className="skills-container">
        {profile.interests.map((interest, index) => {
          // Handle comma-separated values in interest name (e.g., "Music,Design")
          if (interest.name && interest.name.includes(',')) {
            const parts = interest.name.split(',');
            return parts.map((part, partIndex) => (
              <Chip 
                key={`${index}-${partIndex}`} 
                label={part.trim()} 
                className="profile-skill-chip" 
              />
            ));
          }
          return (
            <Chip 
              key={interest.id || index} 
              label={interest.name} 
              className="profile-skill-chip" 
            />
          );
        })}
      </div>
      <Typography variant="body1">Badges:</Typography>
      <div className="badges-container">
        {profile.badges && profile.badges.length > 0 ? (
          profile.badges.map((badge, index) => (
            <div key={index} className="badge-item">
              <Avatar src={`http://localhost:4000${badge.icon}`} alt={badge.name} className="badge-avatar" />
              <Typography variant="caption">{badge.name}</Typography>
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