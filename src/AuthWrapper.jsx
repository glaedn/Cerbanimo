import React, { useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';

const AuthWrapper = ({ children }) => {
  const { isAuthenticated, user, getAccessTokenSilently, isLoading: auth0Loading } = useAuth0();
  const navigate = useNavigate();
  const location = useLocation();

  const [profileData, setProfileData] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [initialSaveDone, setInitialSaveDone] = useState(false);


  useEffect(() => {
    const saveUserAndFetchProfile = async () => {
      if (auth0Loading) return; // Wait for Auth0 to finish loading

      if (isAuthenticated && user) {
        let token;
        try {
          token = await getAccessTokenSilently();
        } catch (tokenError) {
          console.error('Error getting access token:', tokenError);
          setProfileLoading(false); // Can't proceed without a token
          return;
        }

        // 1. Save user to database (only if not done before)
        if (!initialSaveDone) {
          try {
            console.log('Attempting to save user to database:', user.sub);
            await axios.post(
              `http://localhost:4000/auth/save-user`,
              {
                sub: user.sub,
                email: user.email,
                name: user.name || user.nickname || user.email.split('@')[0],
              },
              { headers: { Authorization: `Bearer ${token}` } }
            );
            console.log('User saved to database successfully.');
            setInitialSaveDone(true); // Mark as done
          } catch (error) {
            console.error('Error saving user to database:', error);
            // Decide if this is critical. For now, we'll try to fetch profile anyway.
          }
        }

        // 2. Fetch user profile for onboarding check
        setProfileLoading(true);
        try {
          console.log('Fetching profile for onboarding check:', user.sub);
          const profileResponse = await axios.get(`http://localhost:4000/profile`, {
            params: {
              sub: user.sub,
              email: user.email,
              name: user.name || user.nickname || user.email.split('@')[0], // Ensure name is passed if needed by backend for new users
            },
            headers: { Authorization: `Bearer ${token}` },
          });
          setProfileData(profileResponse.data);
          console.log('Profile data fetched for onboarding check:', profileResponse.data);
        } catch (error) {
          console.error('Error fetching profile for onboarding check:', error);
          setProfileData(null); // Ensure profileData is null on error
        } finally {
          setProfileLoading(false);
        }
      } else if (!auth0Loading && !isAuthenticated) {
        // Not authenticated and Auth0 is not loading anymore
        setProfileLoading(false);
        setProfileData(null);
        setInitialSaveDone(false); // Reset if user logs out
      }
    };

    saveUserAndFetchProfile();
  }, [isAuthenticated, user, auth0Loading, getAccessTokenSilently, initialSaveDone]);

  useEffect(() => {
    // Conditions for checking onboarding:
    // 1. Auth0 is not loading & Profile is not loading.
    // 2. User is authenticated.
    // 3. Profile data has been fetched (even if it's null, means fetch attempt completed).
    // 4. Current path is not already '/onboarding'.
    if (!auth0Loading && !profileLoading && isAuthenticated) {
      if (location.pathname !== '/onboarding') {
        const needsOnboarding = 
          !profileData || // Profile doesn't exist or fetch failed
          !profileData.skills || profileData.skills.length < 3 ||
          !profileData.interests || profileData.interests.length < 3;

        // Only redirect to onboarding if not coming from there and still needs onboarding
        if (needsOnboarding && (!location.state?.fromOnboarding || location.state?.checkProfile)) {
          console.log('User needs onboarding. Profile:', profileData, 'Redirecting...');
          navigate('/onboarding');
        } else if (location.state?.fromOnboarding && !needsOnboarding) {
          // If coming from onboarding and profile is complete, navigate to projects
          console.log('Onboarding complete, navigating to projects');
          navigate('/projects');
        } else {
          console.log('User does not need onboarding. Profile:', profileData);
        }
      } else {
        console.log('Already on onboarding page.');
      }
    }
  }, [profileData, profileLoading, isAuthenticated, navigate, location.pathname, auth0Loading]);

  return <>{children}</>;
};

export default AuthWrapper;