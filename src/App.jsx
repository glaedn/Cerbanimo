import "./App.css";
import * as React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import PrivateRoute from "./components/PrivateRoute.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import ProfilePage from "./pages/ProfilePage/ProfilePage.jsx";
import ProjectPages from "./pages/ProjectPages.jsx";
import SiteNav from "./pages/SiteNav.jsx";
import ProjectCreation from "./pages/ProjectCreation.jsx";
import Project from "./pages/Project.jsx";
import SkillTree from "./pages/SkillTree.jsx";
import RewardDashboard from "./pages/RewardDashboard.jsx";
import PublicProfile from "./pages/PublicProfile.jsx";
import BadgeCreation from "./pages/BadgeCreation.jsx";
import HomePage from "./pages/HomePage.jsx";
import ProjectVisualizer from "./pages/ProjectVisualizer.jsx";
import CommunityCreation from "./pages/CommunityCreation.jsx";
import CommunityHub from "./pages/CommunityHub.jsx";
import Communities from "./pages/Communities.jsx";
import UserPortfolio from "./pages/UserPortfolio.jsx";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import GalacticActivityMap from "./components/GalacticActivityMap/GalacticActivityMap.jsx";
import OnboardingPage from "./pages/OnboardingPage/OnboardingPage";
import AuthWrapper from "./AuthWrapper.jsx";
import TransactionHistoryPage from "./pages/TransactionHistoryPage.jsx"; // Import the new page

const App = () => {
  return (
    <Router>
      <SiteNav />
      <AuthWrapper>
        <Routes>
          {/* Public Route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Private Routes */}
          <Route
            path="/onboarding"
            element={
              <PrivateRoute>
                <OnboardingPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/reward-dashboard"
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
            path="/Visualizer/:projectId/:taskId"
            element={
              <PrivateRoute>
                <ProjectVisualizer />
              </PrivateRoute>
            }
          />
          <Route
            path="/userportfolio/:userId"
            element={
              <PrivateRoute>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <UserPortfolio />
                </LocalizationProvider>
              </PrivateRoute>
            }
          />
          {/* New Route for Galactic Activity Map */}
          <Route
            path="/activity-map"
            element={
              <PrivateRoute>
                <GalacticActivityMap />
              </PrivateRoute>
            }
          />
          {/* New Route for Transaction History */}
          <Route
            path="/transaction-history"
            element={
              <PrivateRoute>
                <TransactionHistoryPage />
              </PrivateRoute>
            }
          />
          {/* Default Route */}
          <Route path="*" element={<HomePage />} />
        </Routes>
      </AuthWrapper>
    </Router>
  );
};

export default App;
