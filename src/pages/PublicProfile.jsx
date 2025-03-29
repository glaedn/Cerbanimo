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
        setProfile(response.data);
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
                <Chip key={index} label={skill} className="profile-skill-chip" />
            ))}
        </div>
        <Typography variant="body1">Interests:</Typography>
        <div className="skills-container">
            {profile.interests.map((interest, index) => (
                <Chip key={index} label={interest} className="profile-skill-chip" />
            ))}
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
