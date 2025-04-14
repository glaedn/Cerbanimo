import React, { useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Link, useLocation } from 'react-router-dom';
import './SiteNav.css';
import { Badge, IconButton, Menu, MenuItem } from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import { useNotifications } from "./NotificationProvider";  // Import the useNotifications hook
import IdleSpaceGame from './IdleSpaceGame';

const SiteNav = () => {
    const { logout, loginWithRedirect, isAuthenticated } = useAuth0();
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isGameOpen, setIsGameOpen] = useState(false);
    const toggleGameTray = () => {
        setIsGameOpen(prev => !prev);
    };
    const { notifications, unreadCount, markAsRead } = useNotifications(); // Destructure markAsRead here
    
    const [anchorEl, setAnchorEl] = useState(null);

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
        const unreadNotifications = notifications.filter(n => !n.read);
        const unreadNotificationIds = unreadNotifications.map(n => n.id);
        
        if (unreadNotificationIds.length > 0) {
          markAsRead(unreadNotificationIds);  // Call markAsRead here
        }
        setAnchorEl(null);
    };

    // Get the most recent 5 notifications
    const recentNotifications = notifications.slice(0, 5);

    return (
        <nav className={`site-nav ${isSidebarOpen ? 'open' : ''}`}>
            <div className="title-container">
                <h1 className="site-title">Cerbanimo</h1>
            </div>
            
            {/* Notification bell - Only show when authenticated */}
            {isAuthenticated && (
                <div className="notification-container">
                    <IconButton color="inherit" onClick={handleOpen}>
                        <Badge badgeContent={unreadCount} color="error">
                            <NotificationsIcon />
                        </Badge>
                    </IconButton>
                    <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
                        {recentNotifications.length === 0 ? (
                            <MenuItem className="notification-menu">No new notifications</MenuItem>
                        ) : (
                            recentNotifications.map((notif, index) => (
                                <MenuItem
                                    key={index}
                                    className={`notification-item ${notif.read ? 'read' : 'unread'}`}
                                >
                                    {notif.message}
                                </MenuItem>
                            ))
                        )}
                    </Menu>
                </div>
            )}
            
            <div className="sidebar-toggle" onClick={toggleSidebar}>
                <span className={`hamburger ${isSidebarOpen ? 'open' : ''}`} />
            </div>
            <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
                <div className="nav-links">
                    <Link
                        className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
                        to="/"
                        onClick={closeSidebar}
                    >
                        Home Page
                    </Link>
                    
                    {/* Only show authenticated links when user is logged in */}
                    {isAuthenticated && (
                        <>
                            <Link
                                className={`nav-link ${location.pathname === '/dashboard' ? 'active' : ''}`}
                                to="/dashboard"
                                onClick={closeSidebar}
                            >
                                Dashboard
                            </Link>
                            <Link
                                className={`nav-link ${location.pathname === '/profile' ? 'active' : ''}`}
                                to="/profile"
                                onClick={closeSidebar}
                            >
                                Profile
                            </Link>
                            <Link
                                className={`nav-link ${location.pathname.startsWith('/projects') ? 'active' : ''}`}
                                to="/projects"
                                onClick={closeSidebar}
                            >
                                Projects
                            </Link>
                            <Link
                                className={`nav-link ${location.pathname.startsWith('/projectcreation') ? 'active' : ''}`}
                                to="/projectcreation"
                                onClick={closeSidebar}
                            >
                                Create a Project
                            </Link>
                        </>
                    )}
                </div>
                
                {/* Conditional rendering of login/logout button */}
                {isAuthenticated ? (
                    <button className="nav-button logout-button" onClick={() => logout({ returnTo: window.location.origin })}>
                        Logout
                    </button>
                ) : (
                    <button className="nav-button login-button" onClick={() => loginWithRedirect()}>
                        Login
                    </button>
                )}
            </div>
          {/* Idle Space Game Tray */}
          <div className={`game-tray-toggle ${isGameOpen ? 'open' : ''}`} onClick={toggleGameTray}>
    <div className="game-tab-icons">
  <div className="emoji-icon">🪐</div>
</div>
</div>

<div className={`game-tray ${isGameOpen ? 'open' : ''}`}>
    <IdleSpaceGame />
</div> 
        </nav>
    );
};

export default SiteNav;
