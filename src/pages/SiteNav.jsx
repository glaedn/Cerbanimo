import React, { useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Link, useLocation } from 'react-router-dom';
import './SiteNav.css';

const SiteNav = () => {
    const { logout } = useAuth0();
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { user, isAuthenticated } = useAuth0();

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    const closeSidebar = () => {
        setSidebarOpen(false);
    };

    return (
        <nav className={`site-nav ${isSidebarOpen ? 'open' : ''}`}>
            <div className="title-container">
                <h1 className="site-title">Cerbanimo</h1>
            </div>
            <div className="sidebar-toggle" onClick={toggleSidebar}>
                <span className={`hamburger ${isSidebarOpen ? 'open' : ''}`} />
            </div>
            <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
                <div className="nav-links">
                <Link
                        className={`nav-link ${location.pathname === '/dashboard' ? 'active' : ''}`}
                        to="/dashboard"
                        onClick={closeSidebar} // Close sidebar when link is clicked
                    >
                        Dashboard
                    </Link>
                    <Link
                        className={`nav-link ${location.pathname === '/profile' ? 'active' : ''}`}
                        to="/profile"
                        onClick={closeSidebar} // Close sidebar when link is clicked
                    >
                        Profile
                    </Link>
                    <Link
                        className={`nav-link ${location.pathname.startsWith('/projects') ? 'active' : ''}`}
                        to="/projects"
                        onClick={closeSidebar} // Close sidebar when link is clicked
                    >
                        Projects
                    </Link>
                    <Link
                        className={`nav-link ${location.pathname.startsWith('/projectcreation') ? 'active' : ''}`}
                        to="/projectcreation"
                        onClick={closeSidebar} // Close sidebar when link is clicked
                    >
                        Create a Project
                    </Link>
                </div>
                <button className="nav-button logout-button" onClick={() => logout({ returnTo: window.location.origin })}>
                    Logout
                </button>
            </div>
        </nav>
    );
};

export default SiteNav;
