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
  Snackbar,
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
import axios from "axios";
import NeedDeclarationForm from "../components/NeedDeclarationForm/NeedDeclarationForm.jsx";
import { useNotifications } from "./NotificationProvider";
import { useUserProfile } from "../hooks/useUserProfile";
import { getProfileImageUrl } from "../utils/avatar";
import { isRouteActive, platformNavItems } from "../utils/platformNavigation";

const sidebarItems = platformNavItems.filter((item) => item.label !== "Notifications");

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

const SiteNav = () => {
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

  const avatarUrl = useMemo(() => getProfileImageUrl(profile, user), [profile, user]);
  const recentNotifications = notifications.slice(0, 5);

  const toggleSidebar = () => setIsSidebarOpen((open) => !open);
  const closeSidebar = () => setIsSidebarOpen(false);

  const handleOpenNotifications = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseNotifications = () => {
    const unreadNotificationIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadNotificationIds.length > 0) {
      markAsRead(unreadNotificationIds);
    }
    setAnchorEl(null);
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
    } else {
      setNotificationState({
        open: true,
        message: "Please log in and ensure your profile is loaded to declare a need.",
        severity: "warning",
      });
    }
  };

  const handleCloseNeedModal = () => setIsNeedModalOpen(false);

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
    <nav className={`site-nav ${isSidebarOpen ? "open" : ""}`}>
      <Link to="/dashboard" className="site-brand" onClick={closeSidebar}>
        <span className="site-brand-mark" aria-hidden="true">
          <RocketLaunchIcon fontSize="small" />
        </span>
        <span className="site-title">Cerbanimo</span>
      </Link>

      <div className="site-nav-actions">
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
