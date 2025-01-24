import React, { useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useLocation, useNavigate } from 'react-router-dom';

const AuthChecker = ({ children }) => {
  const { isAuthenticated, isLoading, getAccessTokenSilently } = useAuth0();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      console.log('Checking auth... Current Path:', location.pathname);

      if (['/login', '/register'].includes(location.pathname)) {
        console.log('Public route detected, skipping silent auth.');
        return;
      }

      if (!isLoading) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5000); // Timeout after 5 seconds

          console.log('Attempting to retrieve access token silently...');
          const token = await getAccessTokenSilently({ signal: controller.signal });
          clearTimeout(timeout);

          console.log('Silent authentication successful, token:', token);
          localStorage.setItem('isAuthenticated', 'true'); // Cache authentication state
        } catch (err) {
          console.error('Silent authentication failed or timed out:', err);
          localStorage.removeItem('isAuthenticated'); // Clear cached state
          navigate('/login');
        }
      }
    };

    checkAuth();
  }, [isLoading, isAuthenticated, getAccessTokenSilently, navigate, location.pathname]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return children;
};

export default AuthChecker;
