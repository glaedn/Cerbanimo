import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { Auth0Provider } from '@auth0/auth0-react';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import store from './store/store';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <Auth0Provider
      domain="dev-i5331ndl5kxve1hd.us.auth0.com"
      clientId="vh3gl8nk3NF6uNkjRT8suuzfFjgCIdiB"
      authorizationParams={{
        //audience: 'https://dev-i5331ndl5kxve1hd.us.auth0.com/api/v2/',
        redirect_uri: `${window.location.origin}/dashboard`,
      }}
    >
      <Provider store={store}>
        <App />
      </Provider>
    </Auth0Provider>,
  document.getElementById('root')
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
