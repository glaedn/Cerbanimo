import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { Auth0Provider } from '@auth0/auth0-react';
import App from './App.jsx';
import NotificationProvider from './pages/NotificationProvider.jsx';
import AuthWrapper from './AuthWrapper.jsx';  // Import the new component

const onRedirectCallback = (appState) => {
  window.history.replaceState(
    {},
    document.title,
    appState?.returnTo || window.location.pathname
  );
};

const root = createRoot(document.getElementById('root'));

root.render(
  <Auth0Provider
    domain="dev-i5331ndl5kxve1hd.us.auth0.com"
    clientId="vh3gl8nk3NF6uNkjRT8suuzfFjgCIdiB"
    authorizationParams={{
      redirect_uri: `${window.location.origin}/dashboard`,
      audience: "http://localhost:4000",
      scope: "openid profile email read:profile write:profile",
    }}
    onRedirectCallback={onRedirectCallback}
    cacheLocation="localstorage"
  >
    <AuthWrapper>
      <NotificationProvider>
        <App />
      </NotificationProvider>
    </AuthWrapper>
  </Auth0Provider>
);