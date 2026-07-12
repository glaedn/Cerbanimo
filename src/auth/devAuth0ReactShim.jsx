/* eslint-disable react/prop-types, react-refresh/only-export-components */
import React from 'react';

const DEFAULT_TOKEN = 'cerbanimo-dev-auth-bypass';
const DEFAULT_SUB = 'auth0|cerbanimo-dev-test';
const DEFAULT_EMAIL = 'cerbanimo-dev-test@example.test';
const DEFAULT_NAME = 'Cerbanimo Dev Tester';

const devUser = {
  sub: import.meta.env.VITE_CERBANIMO_DEV_AUTH_SUB || DEFAULT_SUB,
  email: import.meta.env.VITE_CERBANIMO_DEV_AUTH_EMAIL || DEFAULT_EMAIL,
  name: import.meta.env.VITE_CERBANIMO_DEV_AUTH_NAME || DEFAULT_NAME,
  nickname: import.meta.env.VITE_CERBANIMO_DEV_AUTH_USERNAME || 'cerbanimo-dev-test',
  picture: import.meta.env.VITE_CERBANIMO_DEV_AUTH_PICTURE || ''
};

const devToken = import.meta.env.VITE_CERBANIMO_DEV_AUTH_TOKEN || DEFAULT_TOKEN;
const emptyAuthResult = { appState: {} };
const noop = async () => {};
const devAuthContextValue = {
  isAuthenticated: true,
  isLoading: false,
  user: devUser,
  error: null,
  getAccessTokenSilently: async () => devToken,
  getAccessTokenWithPopup: async () => devToken,
  getIdTokenClaims: async () => ({
    __raw: devToken,
    sub: devUser.sub,
    email: devUser.email,
    name: devUser.name,
    nickname: devUser.nickname,
    picture: devUser.picture
  }),
  loginWithRedirect: noop,
  loginWithPopup: noop,
  logout: noop,
  handleRedirectCallback: async () => emptyAuthResult
};

export const Auth0Provider = ({ children }) => <>{children}</>;

export function useAuth0() {
  return devAuthContextValue;
}

export const withAuthenticationRequired = (Component) => Component;
export const Auth0Context = React.createContext(devAuthContextValue);
