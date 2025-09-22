import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { Auth0Provider } from '@auth0/auth0-react';
import { Provider } from 'react-redux';
import store from './store/store';
import App from './App.jsx';
import DynamicThemeProvider from './components/DynamicThemeProvider.jsx';
import NotificationProvider from './pages/NotificationProvider.jsx';

const onRedirectCallback = (appState) => {
  window.history.replaceState(
    {},
    document.title,
    appState?.returnTo || window.location.pathname
  );
};

const root = createRoot(document.getElementById('root'));

root.render(
  <Provider store={store}>
    <Auth0Provider
        domain="dev-i5331ndl5kxve1hd.us.auth0.com"
        clientId="vh3gl8nk3NF6uNkjRT8suuzfFjgCIdiB"
        authorizationParams={{
          redirect_uri: `${window.location.origin}/dashboard`,
          audience: import.meta.env.VITE_BACKEND_URL,
          scope: "openid profile email read:profile write:profile",
        }}
        onRedirectCallback={onRedirectCallback}
        cacheLocation="localstorage"
      >
      <DynamicThemeProvider>
        <NotificationProvider>
          <App />
        </NotificationProvider>
      </DynamicThemeProvider>
    </Auth0Provider>
  </Provider>
);