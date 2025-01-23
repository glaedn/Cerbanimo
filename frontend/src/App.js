import './App.css';
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import PrivateRoute from './components/PrivateRoute';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        {/* Add private routes here */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <h1>Welcome to the Dashboard</h1>
            </PrivateRoute>
          }
        />
      </Routes>
    </Router>
  );
};

export default App;
