import React from 'react';
import ReactDOM from 'react-dom/client';
import { Auth0Provider } from '@auth0/auth0-react';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <Auth0Provider
      domain="dev-i5331ndl5kxve1hd.us.auth0.com"
      clientId="vh3gl8nk3NF6uNkjRT8suuzfFjgCIdiB"
      redirect_uri= "http://localhost:3000/dashboard"
      audience= "http://localhost:4000/"
      scope="openid profile email"
      cacheLocation="localstorage" // Use local storage to persist session
    >
        <App />
    </Auth0Provider>,
  document.getElementById('root')
);

