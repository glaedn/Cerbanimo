import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from '@mui/material/styles';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import muiTheme from './styles/muiTheme.js';
import GuildsDashboard from './pages/GuildsDashboard.jsx';
import GuildHub from './pages/GuildHub.jsx';
import CommunityHub from './pages/CommunityHub.jsx';
import ConstellationHub from './pages/ConstellationHub.jsx';
import { Auth0Context } from '@auth0/auth0-react';

const MockProvider = ({ children }) => {
  const mockUser = {
    sub: 'auth0|123',
    email: 'test@example.com',
    name: 'Test User',
    nickname: 'tester',
    picture: 'https://via.placeholder.com/150'
  };

  const mockValue = {
    isAuthenticated: true,
    user: mockUser,
    isLoading: false,
    getAccessTokenSilently: async () => 'mock-token',
    loginWithRedirect: () => {},
    logout: () => {},
    handleRedirectCallback: async () => ({ appState: {} }),
    getIdTokenClaims: async () => ({}),
    loginWithPopup: async () => {},
  };

  return (
    <Auth0Context.Provider value={mockValue}>
      {children}
    </Auth0Context.Provider>
  );
};

const VerificationApp = () => {
  return (
    <ThemeProvider theme={muiTheme}>
      <MockProvider>
        <MemoryRouter initialEntries={[window.location.pathname]}>
          <Routes>
            <Route path="/guilds" element={<GuildsDashboard />} />
            <Route path="/guilds/:id" element={<GuildHub />} />
            <Route path="/communityhub/:communityId" element={<CommunityHub />} />
            <Route path="/constellations" element={<ConstellationHub />} />
          </Routes>
        </MemoryRouter>
      </MockProvider>
    </ThemeProvider>
  );
};

const root = createRoot(document.getElementById('root'));
root.render(<VerificationApp />);
