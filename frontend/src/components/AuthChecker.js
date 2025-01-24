import { useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';
import React from 'react';

const AuthChecker = ({ children }) => {
  const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0();
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      if (!isLoading && !isAuthenticated) {
        try {
          // Attempt silent login
          await loginWithRedirect({
            redirectUri: `${window.location.origin}/dashboard`,
            prompt: 'none',
          });
        } catch (err) {
          console.error('Silent login failed:', err);
          navigate('/login');
        }
      }
    };

    checkAuth();
  }, [isLoading, isAuthenticated, loginWithRedirect, navigate]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return children;
};

export default AuthChecker;
