import * as React from 'react'
import { useAuth0 } from '@auth0/auth0-react';
import { useLocation, useNavigate } from 'react-router-dom';

const AuthChecker = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth0();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // No need to retrieve access token if we only care about auth status
    if (['/login', '/register'].includes(location.pathname)) {
      console.log('Public route detected, skipping silent auth.');
      return;
    }

    if (!isLoading && !isAuthenticated) {
      console.log('User is not authenticated, redirecting to login.');
      navigate('/login');
    }
  }, [isLoading, isAuthenticated, navigate, location.pathname]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return children;
};

export default AuthChecker;
