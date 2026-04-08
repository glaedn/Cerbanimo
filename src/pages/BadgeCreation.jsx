import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth0 } from "@auth0/auth0-react";
import { Box, TextField, Button, Typography, Paper, CircularProgress } from "@mui/material";
import { useIsMobile } from "../hooks/useIsMobile";

const approvedUserIds = [
  15, // Add more IDs as needed
];

const BadgeCreation = () => {
  const isMobile = useIsMobile();
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();
  const [userId, setUserId] = useState(null);
  const [isApproved, setIsApproved] = useState(false);
  const [badgeName, setBadgeName] = useState("");
  const [badgeDescription, setBadgeDescription] = useState("");
  const [badgeImage, setBadgeImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");

  useEffect(() => {
    if (isAuthenticated) {
      const fetchUserProfile = async () => {
        try {
          const token = await getAccessTokenSilently();
          const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/profile/`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          const fetchedUserId = response.data.id; // Extract internal user ID
          setUserId(fetchedUserId);
          setIsApproved(approvedUserIds.includes(Number(fetchedUserId)));
        } catch (error) {
          console.error("Error fetching user profile:", error);
        }
      };

      fetchUserProfile();
    }
  }, [isAuthenticated, getAccessTokenSilently]);

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setBadgeImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!badgeName || !badgeDescription || !badgeImage) {
      alert("Please fill in all fields and upload an image.");
      return;
    }

    const formData = new FormData();
    formData.append("name", badgeName);
    formData.append("description", badgeDescription);
    formData.append("icon", badgeImage);
    formData.append("createdBy", userId);

    try {
      const token = await getAccessTokenSilently();
      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/rewards/badges/create`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      alert("Badge created successfully!");
      setBadgeName("");
      setBadgeDescription("");
      setBadgeImage(null);
      setPreviewUrl("");
    } catch (error) {
      console.error("Error creating badge:", error);
      alert("Failed to create badge.");
    }
  };

  if (!isAuthenticated) {
    return <Typography>You must be logged in to create a badge.</Typography>;
  }

  if (!isApproved) {
    return <Typography color="error">You are not authorized to create badges.</Typography>;
  }

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', bgcolor: '#0a0a0a', p: isMobile ? 2 : 4, display: 'flex', justifyContent: 'center' }}>
      <Paper className="cyber-panel" sx={{ maxWidth: 600, width: '100%', p: isMobile ? 3 : 5, bgcolor: 'rgba(10, 10, 46, 0.9)', border: '1px solid #00f3ff' }}>
        <Typography variant="h5" sx={{ fontFamily: 'Orbitron', color: '#00f3ff', mb: 4, textShadow: '0 0 10px #00f3ff', textAlign: 'center' }}>
          NEW BADGE PROTOCOL
        </Typography>

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="BADGE DESIGNATION"
            variant="outlined"
            value={badgeName}
            onChange={(e) => setBadgeName(e.target.value)}
            sx={{
                mb: 3,
                '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: '#00f3ff' } },
                '& .MuiInputLabel-root': { color: '#00f3ff', fontFamily: 'Orbitron' }
            }}
          />
          <TextField
            fullWidth
            label="FUNCTIONAL DESCRIPTION"
            variant="outlined"
            multiline
            rows={4}
            value={badgeDescription}
            onChange={(e) => setBadgeDescription(e.target.value)}
            sx={{
                mb: 3,
                '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: '#00f3ff' } },
                '& .MuiInputLabel-root': { color: '#00f3ff', fontFamily: 'Orbitron' }
            }}
          />

          <Box sx={{ mb: 3, p: 2, border: '1px dashed #ff5ca2', textAlign: 'center', cursor: 'pointer', borderRadius: 1 }} component="label">
            <input type="file" accept="image/*" hidden onChange={handleImageUpload} />
            <Typography variant="body2" sx={{ color: '#ff5ca2', fontFamily: 'Orbitron' }}>
                UPLOAD VISUAL ARTIFACT
            </Typography>
          </Box>

          {previewUrl && (
            <Box sx={{ mb: 3, textAlign: 'center' }}>
                <Typography variant="caption" sx={{ color: '#888', display: 'block', mb: 1 }}>PREVIEW</Typography>
                <img src={previewUrl} alt="Badge Preview" style={{ width: 120, height: 120, border: '2px solid #ff5ca2', borderRadius: '50%', padding: '10px' }} />
            </Box>
          )}

          <Button
            type="submit"
            variant="outlined"
            fullWidth={isMobile}
            sx={{
                mt: 2,
                color: '#00f3ff',
                borderColor: '#00f3ff',
                fontFamily: 'Orbitron',
                height: isMobile ? '56px' : 'auto',
                '&:hover': { bgcolor: 'rgba(0, 243, 255, 0.1)', borderColor: '#00f3ff' }
            }}
          >
            INITIALIZE BADGE
          </Button>
        </form>
      </Paper>
    </Box>
  );
};

export default BadgeCreation;
