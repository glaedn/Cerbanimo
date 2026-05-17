import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import {
  Avatar,
  Badge,
  BottomNavigation,
  BottomNavigationAction,
  Box,
  Drawer,
  IconButton,
  InputBase,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Tooltip,
  Typography,
} from "@mui/material";
import HomeIcon from "@mui/icons-material/Home";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import LanguageIcon from "@mui/icons-material/Language";
import AppsIcon from "@mui/icons-material/Apps";
import NotificationsIcon from "@mui/icons-material/Notifications";
import PersonIcon from "@mui/icons-material/Person";
import SearchIcon from "@mui/icons-material/Search";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import FavoriteIcon from "@mui/icons-material/Favorite";
import GroupsIcon from "@mui/icons-material/Groups";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import StorefrontIcon from "@mui/icons-material/Storefront";
import PublicIcon from "@mui/icons-material/Public";
import TravelExploreIcon from "@mui/icons-material/TravelExplore";
import GavelIcon from "@mui/icons-material/Gavel";
import HubIcon from "@mui/icons-material/Hub";
import SchoolIcon from "@mui/icons-material/School";
import PsychologyIcon from "@mui/icons-material/Psychology";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import MusicNoteIcon from "@mui/icons-material/MusicNote";
import MusicOffIcon from "@mui/icons-material/MusicOff";
import { Slider, Stack } from "@mui/material";
import { useNotifications } from "../pages/NotificationProvider";
import { useUserProfile } from "../hooks/useUserProfile";
import { getProfileImageUrl } from "../utils/avatar";
import { audioEngine } from "../audio/AudioEngine";
import {
  groupedNavItems,
  isRouteActive,
  platformNavItems,
  primaryMobileNavItems,
} from "../utils/platformNavigation";

const mobileIconMap = {
  orbit: <PublicIcon />,
  missions: <RocketLaunchIcon />,
  commons: <GroupsIcon />,
  signals: <TravelExploreIcon />,
};

const trayIconMap = {
  Dashboard: <HomeIcon />,
  Projects: <AccountTreeIcon />,
  Tasks: <AssignmentTurnedInIcon />,
  Needs: <FavoriteIcon />,
  Communities: <LanguageIcon />,
  Guilds: <GroupsIcon />,
  Constellations: <AutoAwesomeIcon />,
  Resources: <Inventory2Icon />,
  Marketplace: <StorefrontIcon />,
  "Activity Map": <PublicIcon />,
  "Impact Atlas": <TravelExploreIcon />,
  "Coordinator HUD": <HubIcon />,
  "Dispute Court": <GavelIcon />,
  "Skill Library": <SchoolIcon />,
  "Interest Library": <PsychologyIcon />,
  "Skill Constellation": <AutoAwesomeIcon />,
  Profile: <PersonIcon />,
  Notifications: <NotificationsIcon />,
};

function resolveBottomValue(pathname) {
  const active = primaryMobileNavItems.find((item) => isRouteActive(pathname, item));
  return active?.path || "tray";
}

const MobileBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, loginWithRedirect } = useAuth0();
  const { profile } = useUserProfile();
  const { unreadCount } = useNotifications();
  const [trayOpen, setTrayOpen] = React.useState(false);
  const [routeQuery, setRouteQuery] = React.useState("");
  const [musicEnabled, setMusicEnabled] = React.useState(true);
  const [sfxEnabled, setSfxEnabled] = React.useState(true);
  const [masterVolume, setMasterVolume] = React.useState(80);

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

  const avatarUrl = React.useMemo(() => getProfileImageUrl(profile, user), [profile, user]);
  const value = resolveBottomValue(location.pathname);

  const filteredItems = React.useMemo(() => {
    const normalized = routeQuery.trim().toLowerCase();
    if (!normalized) return platformNavItems;
    return platformNavItems.filter((item) => (
      item.label.toLowerCase().includes(normalized)
      || item.group?.toLowerCase().includes(normalized)
      || item.path.toLowerCase().includes(normalized)
    ));
  }, [routeQuery]);

  const groupedItems = React.useMemo(() => groupedNavItems(filteredItems), [filteredItems]);

  const navigateWithPulse = (path) => {
    if (window.navigator.vibrate) window.navigator.vibrate(10);
    setTrayOpen(false);
    setRouteQuery("");
    navigate(path);
  };

  const handleChange = (event, nextValue) => {
    if (nextValue === "tray") {
      if (window.navigator.vibrate) window.navigator.vibrate(12);
      setTrayOpen(true);
      return;
    }
    navigateWithPulse(nextValue);
  };

  return (
    <>
      <Box className="mobile-top-actions">
        {isAuthenticated ? (
          <>
            <Tooltip title="Notifications">
              <IconButton
                className="mobile-top-action"
                onClick={() => navigateWithPulse("/notifications")}
                aria-label="Open notifications"
              >
                <Badge badgeContent={unreadCount} color="error" max={99}>
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            </Tooltip>
            <Tooltip title="Profile">
              <IconButton
                className="mobile-profile-action"
                onClick={() => navigateWithPulse("/profile")}
                aria-label="Open profile"
              >
                <Avatar src={avatarUrl} alt={profile?.username || user?.name || "Profile"} />
              </IconButton>
            </Tooltip>
          </>
        ) : (
          <IconButton
            className="mobile-top-action"
            onClick={() => loginWithRedirect()}
            aria-label="Log in"
          >
            <PersonIcon />
          </IconButton>
        )}
      </Box>

      <Paper className="mobile-bottom-nav-shell" elevation={0}>
        <BottomNavigation
          showLabels
          value={value}
          onChange={handleChange}
          className="mobile-bottom-nav"
        >
          {primaryMobileNavItems.map((item) => (
            <BottomNavigationAction
              key={item.path}
              value={item.path}
              label={item.label}
              icon={mobileIconMap[item.icon]}
            />
          ))}
          <BottomNavigationAction value="tray" label="More" icon={<AppsIcon />} />
        </BottomNavigation>
      </Paper>

      <Drawer anchor="right" open={trayOpen} onClose={() => setTrayOpen(false)}>
        <Box className="mobile-nav-tray" role="presentation">
          <Box className="mobile-tray-header">
            <Box className="mobile-tray-mark">
              <RocketLaunchIcon fontSize="small" />
            </Box>
            <Box>
              <Typography variant="h6">Route Tray</Typography>
              <Typography variant="caption">All platform surfaces</Typography>
            </Box>
          </Box>

          <Box className="mobile-tray-audio" sx={{ px: 2, py: 1, borderBottom: '1px solid rgba(95, 240, 255, 0.1)' }}>
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
          </Box>

          <Box className="mobile-tray-search">
            <SearchIcon fontSize="small" />
            <InputBase
              value={routeQuery}
              onChange={(event) => setRouteQuery(event.target.value)}
              placeholder="Search routes"
              inputProps={{ "aria-label": "Search routes" }}
              fullWidth
            />
          </Box>

          <List className="mobile-tray-list">
            {Object.entries(groupedItems).map(([group, items]) => (
              <Box key={group} className="mobile-tray-group">
                <Typography variant="caption" className="mobile-tray-group-label">
                  {group}
                </Typography>
                {items.map((item) => {
                  const active = isRouteActive(location.pathname, item);
                  return (
                    <ListItemButton
                      key={item.path}
                      selected={active}
                      className="mobile-tray-item"
                      onClick={() => navigateWithPulse(item.path)}
                    >
                      <ListItemIcon>{trayIconMap[item.label] || <AppsIcon />}</ListItemIcon>
                      <ListItemText primary={item.label} secondary={item.path} />
                    </ListItemButton>
                  );
                })}
              </Box>
            ))}
          </List>
        </Box>
      </Drawer>
    </>
  );
};

export default MobileBottomNav;
