import React from 'react';
import ReactDOM from 'react-dom';
import { Auth0Provider } from '@auth0/auth0-react';
import App from './App';
import GalacticMap from './pages/GalacticMap';

const onRedirectCallback = (appState) => {
  window.history.replaceState(
    {},
    document.title,
    appState?.returnTo || window.location.pathname
  );
};

ReactDOM.render(
  <Auth0Provider
    domain="dev-i5331ndl5kxve1hd.us.auth0.com"
    clientId="vh3gl8nk3NF6uNkjRT8suuzfFjgCIdiB"
    authorizationParams={{
      redirect_uri: `${window.location.origin}/dashboard`, // This ensures the redirect happens without extra query params
      audience: "http://localhost:4000",
      scope: "openid profile email read:profile write:profile",
    }}
    onRedirectCallback={onRedirectCallback}
    cacheLocation="localstorage" // Store token in localStorage to avoid token loss on refresh
    
    //scope="openid profile email"
  >
    <GalacticMap />
    <App />
  </Auth0Provider>,
  document.getElementById('root')
);

