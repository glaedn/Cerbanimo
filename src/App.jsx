import './App.css';
import * as React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import PrivateRoute from './components/PrivateRoute.jsx';
//import Dashboard from './pages/Dashboard.jsx';
import ProfilePage from './pages/ProfilePage/ProfilePage.jsx';
import ProjectPages from './pages/ProjectPages.jsx';
import SiteNav from './pages/SiteNav.jsx'; 
import ProjectCreation from './pages/ProjectCreation.jsx';
import Project from './pages/Project.jsx';
import SkillTree from './pages/SkillTree.jsx';
import RewardDashboard from './pages/RewardDashboard.jsx';
import PublicProfile from './pages/PublicProfile.jsx';
import BadgeCreation from './pages/BadgeCreation.jsx';

const App = () => {
  return (
    <Router>
      <SiteNav /> 
      <Routes>
        {/* Public Route */}
        <Route path="/login" element={<LoginPage />} />

        {/* Private Routes */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <RewardDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <ProfilePage />
            </PrivateRoute>
          }
        />
        <Route
          path="/projects"
          element={
            <PrivateRoute>
              <ProjectPages />
            </PrivateRoute>
          }
        />
        <Route
          path="/projectcreation"
          element={
            <PrivateRoute>
              <ProjectCreation />
            </PrivateRoute>
          }
        />
        <Route
          path="/project/:projectId"
          element={
            <PrivateRoute>
              <Project />
            </PrivateRoute>
          }
        />
        <Route path="/profile/public/:userId" element={<PublicProfile />} />
        <Route
          path="/profile/skilltree"
          element={
            <PrivateRoute>
              <SkillTree />
            </PrivateRoute>
          }
        />
        <Route
          path="/BadgeCreation"
          element={
            <PrivateRoute>
              <BadgeCreation />
            </PrivateRoute>
          }
        />
        {/* Default Route */}
        <Route path="*" element={<LoginPage />} />
      </Routes>
    </Router>
  );
};

export default App;
