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
import HomePage from './pages/HomePage.jsx';
import ProjectVisualizer from './pages/ProjectVisualizer.jsx';
import CommunityCreation from './pages/CommunityCreation.jsx';
import IdleSpaceGame from './pages/IdleSpaceGame.jsx';
import CommunityHub from './pages/CommunityHub.jsx';
import Communities from './pages/Communities.jsx';

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
          path="/communitycreation"
          element={
            <PrivateRoute>
              <CommunityCreation />
            </PrivateRoute>
          }
        />
        <Route
          path="/communityhub/:communityId"
          element={
            <PrivateRoute>
              <CommunityHub />
            </PrivateRoute>
          }
        />
        <Route
          path="/communities"
          element={
            <PrivateRoute>
              <Communities />
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
        <Route
          path="/Visualizer/:projectId"
          element={
            <PrivateRoute>
              <ProjectVisualizer />
            </PrivateRoute>
          }
        />
        <Route
          path="/idlespacegame"
          element={
            <PrivateRoute>
              <IdleSpaceGame />
            </PrivateRoute>
          }
        />
        {/* Default Route */}
        <Route path="*" element={<HomePage />} />
      </Routes>
    </Router>
  );
};

export default App;
