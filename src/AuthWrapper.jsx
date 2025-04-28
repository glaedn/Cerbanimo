import React, { useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import axios from 'axios';

const AuthWrapper = ({ children }) => {
  const { isAuthenticated, user, getAccessTokenSilently, isLoading } = useAuth0();

  useEffect(() => {
    const saveUserToDatabase = async () => {
      // Only proceed if the user is authenticated and we have user data
      if (isAuthenticated && user) {
        try {
          console.log('Attempting to save user to database:', user.sub);
          const token = await getAccessTokenSilently();
          
          // Call your save-user endpoint
          const response = await axios.post(
            'http://localhost:4000/auth/save-user',
            {
              sub: user.sub,
              email: user.email,
              name: user.name || user.nickname || user.email.split('@')[0]
            },
            {
              headers: {
                Authorization: `Bearer ${token}`
              }
            }
          );
          
          console.log('User database response:', response.data);
        } catch (error) {
          console.error('Error saving user to database:', error);
        }
      }
    };

    // Only try to save user if authentication has completed loading
    if (!isLoading) {
      saveUserToDatabase();
    }
  }, [isAuthenticated, user, getAccessTokenSilently, isLoading]);

  return <>{children}</>;
};

export default AuthWrapper;