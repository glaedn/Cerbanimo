import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth0 } from "@auth0/auth0-react";
import { Box, TextField, Button, Typography, Paper } from "@mui/material";

const approvedUserIds = [
  15, // Add more IDs as needed
];

const BadgeCreation = () => {
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
    <Box sx={{ maxWidth: 500, margin: "auto", mt: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Create a New Badge
        </Typography>
        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Badge Name"
            variant="outlined"
            value={badgeName}
            onChange={(e) => setBadgeName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Badge Description"
            variant="outlined"
            multiline
            rows={3}
            value={badgeDescription}
            onChange={(e) => setBadgeDescription(e.target.value)}
            sx={{ mb: 2 }}
          />
          <input type="file" accept="image/*" onChange={handleImageUpload} />
          {previewUrl && <img src={previewUrl} alt="Badge Preview" style={{ width: "100%", marginTop: 10 }} />}
          <Button type="submit" variant="contained" color="primary" sx={{ mt: 2 }}>
            Submit Badge
          </Button>
        </form>
      </Paper>
    </Box>
  );
};

export default BadgeCreation;
