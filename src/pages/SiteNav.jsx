import React, { useState, useEffect, useCallback } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { Link, useLocation } from "react-router-dom";
import "./SiteNav.css";
import {
  Badge,
  IconButton,
  Menu,
  MenuItem,
  Button,
  Modal,
  Paper,
  Box,
  Snackbar,
  Alert,
  Typography,
} from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import CancelIcon from "@mui/icons-material/Cancel";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import ListAltIcon from "@mui/icons-material/ListAlt";
import InfoIcon from "@mui/icons-material/Info";
import { useNotifications } from "./NotificationProvider";
import IdleSpaceGame from "./IdleSpaceGame";
import LevelNotification from "../components/LevelNotification/LevelNotification";
import axios from "axios";
import NeedDeclarationForm from "../components/NeedDeclarationForm/NeedDeclarationForm.jsx";

const SiteNav = () => {
  const {
    user,
    logout,
    loginWithRedirect,
    isAuthenticated,
    getAccessTokenSilently,
  } = useAuth0(); // Added user, getAccessTokenSilently
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isGameOpen, setIsGameOpen] = useState(false);
  const toggleGameTray = () => {
    setIsGameOpen((prev) => !prev);
  };
  const { notifications, unreadCount, markAsRead } = useNotifications();

  const [anchorEl, setAnchorEl] = useState(null);

  // State for Need Declaration Modal
  const [isNeedModalOpen, setIsNeedModalOpen] = useState(false);
  const [userProfileId, setUserProfileId] = useState(null);
  const [notificationState, setNotificationState] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  // State for LevelNotification demo
  const [demoPreviousXP, setDemoPreviousXP] = useState(0);
  const [demoNewXP, setDemoNewXP] = useState(0);
  const [demoPreviousLevel, setDemoPreviousLevel] = useState(1);
  const [demoNewLevel, setDemoNewLevel] = useState(1);

  const getSiteNavNotificationIcon = (type) => {
    if (!type) type = "default"; // Handle undefined type

    switch (
      type.toLowerCase() // Use toLowerCase for case-insensitive matching
    ) {
      case "task-approved":
        return <TaskAltIcon style={{ marginRight: "8px" }} />;
      case "task-rejected":
        return <CancelIcon style={{ marginRight: "8px" }} />;
      case "task-submitted":
        return <NotificationsActiveIcon style={{ marginRight: "8px" }} />;
      case "task":
        return <ListAltIcon style={{ marginRight: "8px" }} />;
      default:
        return <InfoIcon style={{ marginRight: "8px" }} />;
    }
  };

  const handleGainXP = () => {
    setDemoPreviousXP(demoNewXP);
    setDemoPreviousLevel(demoNewLevel);

    let newXPVal = demoNewXP + 30; // Gain 30 XP
    let newLevelVal = demoNewLevel;

    if (newXPVal >= 100) {
      newXPVal -= 100; // Reset XP for new level
      newLevelVal += 1; // Increment level
    }
    setDemoNewXP(newXPVal);
    setDemoNewLevel(newLevelVal);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  // Notification handlers
  const handleOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    // Mark notifications as read when user opens the dropdown
    const unreadNotifications = notifications.filter((n) => !n.read);
    const unreadNotificationIds = unreadNotifications.map((n) => n.id);

    if (unreadNotificationIds.length > 0) {
      markAsRead(unreadNotificationIds); // Call markAsRead here
    }
    setAnchorEl(null);
  };

  // Get the most recent 5 notifications
  const recentNotifications = notifications.slice(0, 5);

  // Fetch User Profile ID
  const fetchUserProfileId = useCallback(async () => {
    if (isAuthenticated && user?.sub && !userProfileId) {
      try {
        const token = await getAccessTokenSilently();
        const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/profile`, {
          params: { sub: user.sub, email: user.email },
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.data && response.data.id) {
          setUserProfileId(response.data.id);
        }
      } catch (error) {
        console.error("Error fetching user profile ID:", error);
        setNotificationState({
          open: true,
          message: "Could not fetch user profile for needs.",
          severity: "error",
        });
      }
    }
  }, [
    isAuthenticated,
    user,
    userProfileId,
    getAccessTokenSilently,
    setUserProfileId,
  ]);

  useEffect(() => {
    fetchUserProfileId();
  }, [fetchUserProfileId]);

  // Need Modal Handlers
  const handleOpenNeedModal = () => {
    if (isAuthenticated && userProfileId) {
      setIsNeedModalOpen(true);
    } else {
      setNotificationState({
        open: true,
        message:
          "Please log in and ensure your profile is loaded to declare a need.",
        severity: "warning",
      });
    }
  };

  const handleCloseNeedModal = () => setIsNeedModalOpen(false);

  const handleNeedSubmit = async (needData) => {
    try {
      const token = await getAccessTokenSilently();
      // The NeedDeclarationForm already sets requestor_user_id to loggedInUserId (which is userProfileId here)
      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/needs`, needData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotificationState({
        open: true,
        message: "Need declared successfully!",
        severity: "success",
      });
      handleCloseNeedModal();
    } catch (error) {
      console.error(
        "Error declaring need:",
        error.response ? error.response.data : error.message
      );
      setNotificationState({
        open: true,
        message: `Failed to declare need: ${
          error.response?.data?.error || error.message
        }`,
        severity: "error",
      });
    }
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === "clickaway") {
      return;
    }
    setNotificationState((prev) => ({ ...prev, open: false }));
  };

  return (
    <nav className={`site-nav ${isSidebarOpen ? "open" : ""}`}>
      <div className="title-container">
        <h1 className="site-title">Cerbanimo</h1>
      </div>

      {isAuthenticated && (
        <div className="notification-container">
          <IconButton color="inherit" onClick={handleOpen}>
            <Badge badgeContent={unreadCount} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleClose}
          >
            {recentNotifications.length === 0 ? (
              <MenuItem className="notification-menu">
                No new notifications
              </MenuItem>
            ) : (
              recentNotifications.map((notif, index) => {
                const icon = getSiteNavNotificationIcon(notif.type);
                return (
                    <MenuItem
                        key={index}
                        className="notification-menu"
                        style={{
                            whiteSpace: "normal",
                            wordBreak: "break-word",
                            maxWidth: 320,
                            lineHeight: 1.4,
                        }}
                    >
                        {icon}
                        <span style={{ display: "inline", whiteSpace: "normal", wordBreak: "break-word" }}>
                            {notif.projectId && notif.taskId ? (
                                <Link
                                    to={`/visualizer/${notif.projectId}/${notif.taskId}`}
                                    style={{
                                        textDecoration: "underline",
                                        color: "#8db8ff",
                                        wordBreak: "break-word",
                                        whiteSpace: "normal",
                                    }}
                                >
                                    {notif.messageText}
                                </Link>
                            ) : (
                                notif.messageText
                            )}
                        </span>
                    </MenuItem>
                );
              })
            )}
          </Menu>
        </div>
      )}

      <div className="sidebar-toggle" onClick={toggleSidebar}>
        <span className={`hamburger ${isSidebarOpen ? "open" : ""}`} />
      </div>
      <div className={`sidebar ${isSidebarOpen ? "open" : ""}`}>
        <div className="nav-links">
          <Link
            className={`nav-link ${location.pathname === "/" ? "active" : ""}`}
            to="/"
            onClick={closeSidebar}
          >
            Home Page
          </Link>

          {isAuthenticated && (
            <>
              <Link
                className={`nav-link ${
                  location.pathname === "/dashboard" ? "active" : ""
                }`}
                to="/dashboard"
                onClick={closeSidebar}
              >
                Dashboard
              </Link>
              <Link
                className={`nav-link ${
                  location.pathname === "/profile" ? "active" : ""
                }`}
                to="/profile"
                onClick={closeSidebar}
              >
                Profile
              </Link>
              <Link
                className={`nav-link ${
                  location.pathname.startsWith("/projects") ? "active" : ""
                }`}
                to="/projects"
                onClick={closeSidebar}
              >
                Projects
              </Link>
              <Link
                className={`nav-link ${
                  location.pathname.startsWith("/communities") ? "active" : ""
                }`}
                to="/communities"
                onClick={closeSidebar}
              >
                Communities
              </Link>
              <Link
                className={`nav-link ${
                  location.pathname.startsWith("/projectcreation")
                    ? "active"
                    : ""
                }`}
                to="/projectcreation"
                onClick={closeSidebar}
              >
                Create a Project
              </Link>
              <Link
                className={`nav-link ${
                  location.pathname.startsWith("/communitycreation")
                    ? "active"
                    : ""
                }`}
                to="/communitycreation"
                onClick={closeSidebar}
              >
                Create a Community
              </Link>
              {/* Declare a Need Button */}
              <Button
                variant="text"
                onClick={handleOpenNeedModal}
                disabled={!userProfileId}
                sx={{
                  color: "var(--text-color)", // Use CSS variable for color
                  justifyContent: "flex-start",
                  padding: "10px 15px", // Match nav-link padding
                  textTransform: "none", // Match nav-link text transform
                  fontSize: "1rem", // Match nav-link font size
                  "&:hover": {
                    backgroundColor: "var(--hover-bg-color)", // Use CSS variable for hover
                  },
                }}
                className="nav-link" // Apply nav-link class for consistent styling
              >
                Declare a Need
              </Button>
            </>
          )}
        </div>

        {isAuthenticated ? (
          <button
            className="nav-button logout-button"
            onClick={() => logout({ returnTo: import.meta.env.VITE_FRONTEND_URL })}
          >
            Logout
          </button>
        ) : (
          <button
            className="nav-button login-button"
            onClick={() => loginWithRedirect()}
          >
            Login
          </button>
        )}
      </div>

      {/* Need Declaration Modal */}
      <Modal
        open={isNeedModalOpen}
        onClose={handleCloseNeedModal}
        aria-labelledby="declare-need-modal-title"
      >
        <Paper
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: { xs: "90%", sm: "75%", md: "600px" },
            maxHeight: "90vh",
            overflowY: "auto",
            bgcolor: "background.paper",
            boxShadow: 24,
            p: { xs: 2, sm: 3, md: 4 },
            borderRadius: 2,
          }}
        >
          <Typography variant="h6" id="declare-need-modal-title" gutterBottom>
            Declare Your Need
          </Typography>
          <NeedDeclarationForm
            onSubmit={handleNeedSubmit}
            onCancel={handleCloseNeedModal}
            loggedInUserId={userProfileId}
            // No initialNeedData as it's for new declarations
            // No communityId as it's for individual needs from SiteNav
          />
        </Paper>
      </Modal>

      {/* Snackbar for Notifications */}
      <Snackbar
        open={notificationState.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={notificationState.severity}
          sx={{ width: "100%" }}
        >
          {notificationState.message}
        </Alert>
      </Snackbar>
    </nav>
  );
};

export default SiteNav;
