import React from 'react';

const Auth0Context = React.createContext();

export const Auth0Provider = ({ children }) => {
  const value = {
    isAuthenticated: true,
    isLoading: false,
    user: { sub: 'auth0|123', email: 'test@example.com', name: 'Test User' },
    getAccessTokenSilently: () => Promise.resolve('mock-token'),
    loginWithRedirect: () => {},
    logout: () => {},
  };
  return <Auth0Context.Provider value={value}>{children}</Auth0Context.Provider>;
};

export const useAuth0 = () => React.useContext(Auth0Context);
