import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BottomNavigation, BottomNavigationAction, Paper } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import ListAltIcon from '@mui/icons-material/ListAlt';
import GroupIcon from '@mui/icons-material/Group';
import PersonIcon from '@mui/icons-material/Person';

const MobileBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Map routes to navigation indices
  const getIndexFromPath = (path) => {
    if (path === '/' || path === '/dashboard') return 0;
    if (path.startsWith('/projects')) return 1;
    if (path.startsWith('/tasks') || path.startsWith('/visualizer')) return 2; // Assuming tasks are related to visualizer/browser
    if (path.startsWith('/guilds')) return 3;
    if (path.startsWith('/profile')) return 4;
    return 0;
  };

  const [value, setValue] = React.useState(getIndexFromPath(location.pathname));

  React.useEffect(() => {
    setValue(getIndexFromPath(location.pathname));
  }, [location.pathname]);

  const handleChange = (event, newValue) => {
    setValue(newValue);
    switch (newValue) {
      case 0: navigate('/dashboard'); break;
      case 1: navigate('/projects'); break;
      case 2: navigate('/projects'); break; // TaskBrowser route is not explicitly mapped in App.jsx yet, using projects for now as requested
      case 3: navigate('/guilds'); break;
      case 4: navigate('/profile'); break;
      default: navigate('/dashboard');
    }
  };

  return (
    <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1100 }} elevation={3}>
      <BottomNavigation
        showLabels
        value={value}
        onChange={handleChange}
        sx={{
          backgroundColor: '#0a0a2e',
          '& .MuiBottomNavigationAction-root': {
            color: 'rgba(0, 243, 255, 0.5)',
            '&.Mui-selected': {
              color: '#00F3FF',
            },
          },
        }}
      >
        <BottomNavigationAction label="Home" icon={<HomeIcon />} />
        <BottomNavigationAction label="Projects" icon={<AccountTreeIcon />} />
        <BottomNavigationAction label="Tasks" icon={<ListAltIcon />} />
        <BottomNavigationAction label="Guilds" icon={<GroupIcon />} />
        <BottomNavigationAction label="Profile" icon={<PersonIcon />} />
      </BottomNavigation>
    </Paper>
  );
};

export default MobileBottomNav;
