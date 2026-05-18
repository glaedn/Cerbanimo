import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { Link, useLocation } from "react-router-dom";
import "./SiteNav.css";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Modal,
  Paper,
  Slider,
  Snackbar,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import CancelIcon from "@mui/icons-material/Cancel";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import ListAltIcon from "@mui/icons-material/ListAlt";
import InfoIcon from "@mui/icons-material/Info";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import MusicNoteIcon from "@mui/icons-material/MusicNote";
import MusicOffIcon from "@mui/icons-material/MusicOff";
import axios from "axios";
import NeedDeclarationForm from "../components/NeedDeclarationForm/NeedDeclarationForm.jsx";
import { useNotifications } from "./NotificationProvider";
import { useUserProfile } from "../hooks/useUserProfile";
import { getProfileImageUrl } from "../utils/avatar";
import { isRouteActive, platformNavItems, CORE_MODES } from "../utils/platformNavigation";
import { audioEngine } from "../audio/AudioEngine";

const sidebarItems = []; // Pruned for Phase 1: Everything is now contextual or in core modes

const getSiteNavNotificationIcon = (type) => {
  switch ((type || "default").toLowerCase()) {
    case "task-approved":
      return <TaskAltIcon fontSize="small" className="notification-type-icon" />;
    case "task-rejected":
      return <CancelIcon fontSize="small" className="notification-type-icon" />;
    case "task-submitted":
      return <NotificationsActiveIcon fontSize="small" className="notification-type-icon" />;
    case "task":
      return <ListAltIcon fontSize="small" className="notification-type-icon" />;
    case "service_purchase":
      return <NotificationsActiveIcon fontSize="small" className="notification-type-icon" />;
    default:
      return <InfoIcon fontSize="small" className="notification-type-icon" />;
  }
};

const SiteNav = ({ inShell = false }) => {
  const {
    user,
    logout,
    loginWithRedirect,
    isAuthenticated,
    getAccessTokenSilently,
  } = useAuth0();
  const location = useLocation();
  const { profile } = useUserProfile();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const [anchorEl, setAnchorEl] = useState(null);
  const [isNeedModalOpen, setIsNeedModalOpen] = useState(false);
  const [userProfileId, setUserProfileId] = useState(null);
  const [notificationState, setNotificationState] = useState({
    open: false,
    message: "",
    severity: "info",
  });
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [sfxEnabled, setSfxEnabled] = useState(true);
  const [masterVolume, setMasterVolume] = useState(80);

  const toggleMusic = () => {
    const newState = !musicEnabled;
    setMusicEnabled(newState);
    audioEngine.toggleTheme(newState);
    audioEngine.trigger("ui.click");
  };

  const toggleSFX = () => {
    const newState = !sfxEnabled;
    setSfxEnabled(newState);
    audioEngine.toggleUI(newState);
    audioEngine.trigger("ui.click");
  };

  const handleVolumeChange = (event, newValue) => {
    setMasterVolume(newValue);
    audioEngine.setMasterVolume(newValue);
  };

  const avatarUrl = useMemo(() => getProfileImageUrl(profile, user), [profile, user]);
  const recentNotifications = notifications.slice(0, 5);

  const toggleSidebar = () => {
    const nextState = !isSidebarOpen;
    setIsSidebarOpen(nextState);
    audioEngine.trigger(nextState ? "ui.sidebar_open" : "ui.sidebar_close");
  };
  const closeSidebar = () => {
    if (isSidebarOpen) {
      setIsSidebarOpen(false);
      audioEngine.trigger("ui.sidebar_close");
    }
  };

  const handleOpenNotifications = (event) => {
    setAnchorEl(event.currentTarget);
    audioEngine.trigger("ui.dropdown_open");
  };

  const handleCloseNotifications = () => {
    const unreadNotificationIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadNotificationIds.length > 0) {
      markAsRead(unreadNotificationIds);
    }
    setAnchorEl(null);
    audioEngine.trigger("ui.dropdown_close");
  };

  const fetchUserProfileId = useCallback(async () => {
    if (isAuthenticated && user?.sub && !userProfileId) {
      try {
        const token = await getAccessTokenSilently();
        const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/profile`, {
          params: { sub: user.sub, email: user.email },
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.data?.id) {
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
  }, [isAuthenticated, user, userProfileId, getAccessTokenSilently]);

  useEffect(() => {
    fetchUserProfileId();
  }, [fetchUserProfileId]);

  const handleOpenNeedModal = () => {
    if (isAuthenticated && userProfileId) {
      setIsNeedModalOpen(true);
      audioEngine.trigger("ui.modal_open");
    } else {
      setNotificationState({
        open: true,
        message: "Please log in and ensure your profile is loaded to declare a need.",
        severity: "warning",
      });
    }
  };

  const handleCloseNeedModal = () => {
    setIsNeedModalOpen(false);
    audioEngine.trigger("ui.modal_close");
  };

  const handleNeedSubmit = async (needData) => {
    try {
      const token = await getAccessTokenSilently();
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
      console.error("Error declaring need:", error.response ? error.response.data : error.message);
      setNotificationState({
        open: true,
        message: `Failed to declare need: ${error.response?.data?.error || error.message}`,
        severity: "error",
      });
    }
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === "clickaway") return;
    setNotificationState((prev) => ({ ...prev, open: false }));
  };

  return (
    <nav className={`site-nav ${isSidebarOpen ? "open" : ""} ${inShell ? "in-shell" : ""}`}>
      <Link to="/dashboard" className="site-brand" onClick={closeSidebar}>
        <span className="site-brand-mark" aria-hidden="true">
          <RocketLaunchIcon fontSize="small" />
        </span>
        <span className="site-title">Cerbanimo</span>
      </Link>

      <div className="site-nav-actions">
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mr: 2, display: { xs: 'none', sm: 'flex' } }}>
          <Tooltip title={`Music ${musicEnabled ? 'On' : 'Off'}`}>
            <IconButton size="small" onClick={toggleMusic} sx={{ color: musicEnabled ? '#5ff0ff' : '#666' }}>
              {musicEnabled ? <MusicNoteIcon fontSize="small" /> : <MusicOffIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
          <Tooltip title={`SFX ${sfxEnabled ? 'On' : 'Off'}`}>
            <IconButton size="small" onClick={toggleSFX} sx={{ color: sfxEnabled ? '#5ff0ff' : '#666' }}>
              {sfxEnabled ? <VolumeUpIcon fontSize="small" /> : <VolumeOffIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
          <Stack spacing={2} direction="row" sx={{ width: 100, ml: 1 }} alignItems="center">
            <VolumeOffIcon sx={{ color: '#666', fontSize: 16 }} />
            <Slider
              size="small"
              value={masterVolume}
              onChange={handleVolumeChange}
              aria-label="Volume"
              sx={{
                color: '#5ff0ff',
                '& .MuiSlider-thumb': {
                  width: 12,
                  height: 12,
                  '&:before': { boxShadow: '0 0 10px rgba(95, 240, 255, 0.4)' },
                },
                '& .MuiSlider-rail': { opacity: 0.2 },
              }}
            />
            <VolumeUpIcon sx={{ color: '#5ff0ff', fontSize: 16 }} />
          </Stack>
        </Stack>

        {isAuthenticated && (
          <>
            <Tooltip title="Notifications">
              <IconButton
                className="nav-icon-button"
                color="inherit"
                onClick={handleOpenNotifications}
                aria-label="Open notifications"
              >
                <Badge badgeContent={unreadCount} color="error" max={99}>
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            </Tooltip>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleCloseNotifications}
              MenuListProps={{ className: "notification-list" }}
            >
              {recentNotifications.length === 0 ? (
                <MenuItem className="notification-menu">No new notifications</MenuItem>
              ) : (
                recentNotifications.map((notif, index) => (
                  <MenuItem
                    key={notif.id || index}
                    className={`notification-menu ${notif.read ? "read" : "unread"}`}
                    onClick={handleCloseNotifications}
                  >
                    {getSiteNavNotificationIcon(notif.type)}
                    <span className="notification-copy">
                      {notif.type === "service_purchase" && notif.buyerId && notif.buyerUsername ? (
                        <>
                          <Link className="notification-link pink" to={`/profile/public/${notif.buyerId}`}>
                            {notif.buyerUsername}
                          </Link>
                          {" has purchased your service: "}
                          <Link className="notification-link cyan" to={`/Visualizer/${notif.projectId}`}>
                            {notif.serviceName || "Project"}
                          </Link>
                          {"!"}
                        </>
                      ) : notif.projectId ? (
                        <Link
                          className="notification-link cyan"
                          to={notif.taskId ? `/Visualizer/${notif.projectId}/${notif.taskId}` : `/Visualizer/${notif.projectId}`}
                        >
                          {notif.messageText}
                        </Link>
                      ) : (
                        notif.messageText
                      )}
                    </span>
                  </MenuItem>
                ))
              )}
            </Menu>
            <Tooltip title="Profile">
              <IconButton
                component={Link}
                to="/profile"
                className="profile-avatar-button"
                color="inherit"
                aria-label="Open profile"
              >
                <Avatar src={avatarUrl} alt={profile?.username || user?.name || "Profile"} />
              </IconButton>
            </Tooltip>
          </>
        )}

        <button
          className="sidebar-toggle"
          onClick={toggleSidebar}
          aria-label="Toggle platform navigation"
          aria-expanded={isSidebarOpen}
          type="button"
        >
          <span className={`hamburger ${isSidebarOpen ? "open" : ""}`} />
        </button>
      </div>

      <div className={`sidebar ${isSidebarOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <span className="sidebar-kicker">NAV ARRAY</span>
          <Typography variant="h6" className="sidebar-title">Platform Routes</Typography>
        </div>

        <div className="nav-links">
          <div className="sidebar-audio-section" style={{ padding: '0 20px 20px', borderBottom: '1px solid rgba(95, 240, 255, 0.1)', marginBottom: '10px' }}>
            <Typography variant="caption" sx={{ color: 'rgba(95, 240, 255, 0.5)', mb: 1, display: 'block' }}>AUDIO_ARRAY</Typography>
            <Stack direction="row" spacing={2} alignItems="center">
               <IconButton size="small" onClick={toggleMusic} sx={{ color: musicEnabled ? '#5ff0ff' : '#666' }}>
                {musicEnabled ? <MusicNoteIcon /> : <MusicOffIcon />}
              </IconButton>
              <IconButton size="small" onClick={toggleSFX} sx={{ color: sfxEnabled ? '#5ff0ff' : '#666' }}>
                {sfxEnabled ? <VolumeUpIcon /> : <VolumeOffIcon />}
              </IconButton>
              <Slider
                size="small"
                value={masterVolume}
                onChange={handleVolumeChange}
                sx={{ color: '#5ff0ff', flex: 1 }}
              />
            </Stack>
          </div>
          {isAuthenticated && (
            <Button
              variant="text"
              onClick={handleOpenNeedModal}
              disabled={!userProfileId}
              className="nav-link nav-link-button"
            >
              Declare a Need
            </Button>
          )}

          {sidebarItems.map((item) => (
            <Link
              key={item.path}
              className={`nav-link ${isRouteActive(location.pathname, item) ? "active" : ""}`}
              to={item.path}
              onClick={closeSidebar}
            >
              <span>{item.label}</span>
              <small>{item.group}</small>
            </Link>
          ))}
        </div>

        {isAuthenticated ? (
          <button
            className="nav-button logout-button"
            onClick={() => logout({ returnTo: window.location.origin })}
            type="button"
          >
            Logout
          </button>
        ) : (
          <button
            className="nav-button login-button"
            onClick={() => loginWithRedirect()}
            type="button"
          >
            Login
          </button>
        )}
      </div>

      {isSidebarOpen && <button className="nav-scrim" onClick={closeSidebar} aria-label="Close navigation" type="button" />}

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
          />
        </Paper>
      </Modal>

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
