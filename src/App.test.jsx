import { render, screen } from '@testing-library/react';
import App from './App';
import { ThemeProvider } from '@mui/material/styles';
import muiTheme from './styles/muiTheme.js';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { Auth0Provider } from '@auth0/auth0-react';
import { vi } from 'vitest';
import NotificationProvider from './pages/NotificationProvider.jsx';
import { CrisisProvider } from './context/CrisisContext.jsx';
import { LoFiProvider } from './context/LoFiContext.jsx';
import * as Tone from 'tone';

// Mock Auth0Provider
vi.mock('@auth0/auth0-react', async () => {
  const actual = await vi.importActual('@auth0/auth0-react');
  return {
    ...actual,
    Auth0Provider: ({ children }) => <div>{children}</div>,
    useAuth0: () => ({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      loginWithRedirect: vi.fn(),
      logout: vi.fn(),
      getAccessTokenSilently: vi.fn(),
    }),
  };
});

test('renders app and check for branding', () => {
  render(
    <Auth0Provider>
      <ThemeProvider theme={muiTheme}>
        <QueryClientProvider client={queryClient}>
          <CrisisProvider>
            <LoFiProvider>
              <NotificationProvider>
                <App />
              </NotificationProvider>
            </LoFiProvider>
          </CrisisProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </Auth0Provider>
  );

  const branding = screen.getAllByText(/Cerbanimo/i);
  expect(branding.length).toBeGreaterThan(0);
});
