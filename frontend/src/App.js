import React from 'react';
import LoginButton from './components/Auth/LoginButton';
import LogoutButton from './components/Auth/LogoutButton';

const App = () => {
  return (
    <div>
      <h1>Welcome to Cerbanimo</h1>
      <LoginButton />
      <LogoutButton />
    </div>
  );
};

export default App;
