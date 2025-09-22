import "./App.css";
import * as React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import PrivateRoute from "./components/PrivateRoute.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import ProfilePage from "./pages/ProfilePage/ProfilePage.jsx";
import IntentionPages from "./pages/IntentionPages.jsx";
import SiteNav from "./pages/SiteNav.jsx";
import IntentionCreation from "./pages/IntentionCreation.jsx";
import Intention from "./pages/Intention.jsx";
import AffinityTree from "./pages/AffinityTree.jsx";
import RewardDashboard from "./pages/RewardDashboard.jsx";
import PublicProfile from "./pages/PublicProfile.jsx";
import BadgeCreation from "./pages/BadgeCreation.jsx";
import HomePage from "./pages/HomePage.jsx";
import IntentionVisualizer from "./pages/IntentionVisualizer.jsx";
import DreamCircleCreation from "./pages/DreamCircleCreation.jsx";
import CommunityHub from "./pages/CommunityHub.jsx";
import DreamCircles from "./pages/DreamCircles.jsx";
import UserGrimoire from "./pages/UserGrimoire.jsx";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import GalacticActivityMap from "./components/GalacticActivityMap/GalacticActivityMap.jsx";
import OnboardingPage from "./pages/OnboardingPage/OnboardingPage";
import WaitingListPage from "./pages/WaitingListPage.jsx"; // Added import
import AuthWrapper from "./AuthWrapper.jsx";
import NotificationProvider from "./pages/NotificationProvider.jsx";
import Astra from "./components/Astra/Astra.jsx";

const App = () => {
  return (
    <Router>
      <NotificationProvider>
        <SiteNav />
        <AuthWrapper>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/waiting-list" element={<WaitingListPage />} />

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
              path="/intentions"
              element={
                <PrivateRoute>
                  <IntentionPages />
                </PrivateRoute>
              }
            />
            <Route
              path="/intentioncreation"
              element={
                <PrivateRoute>
                  <IntentionCreation />
                </PrivateRoute>
              }
            />
            <Route
            path="/intention/:projectId"
              element={
                <PrivateRoute>
                <Intention />
                </PrivateRoute>
              }
            />
            <Route path="/profile/public/:userId" element={<PublicProfile />} />
            <Route
              path="/profile/affinitytree"
              element={
                <PrivateRoute>
                  <AffinityTree />
                </PrivateRoute>
              }
            />
            <Route
              path="/createdreamcircle"
              element={
                <PrivateRoute>
                  <DreamCircleCreation />
                </PrivateRoute>
              }
            />
            <Route
              path="/community/:communityId"
              element={
                <PrivateRoute>
                  <CommunityHub />
                </PrivateRoute>
              }
            />
            <Route
              path="/dreamcircles"
              element={
                <PrivateRoute>
                  <DreamCircles />
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
              path="/visualizer/:intentionId"
              element={
                <PrivateRoute>
                  <IntentionVisualizer />
                </PrivateRoute>
              }
            />
            <Route
              path="/visualizer/:intentionId/:questId"
              element={
                <PrivateRoute>
                  <IntentionVisualizer />
                </PrivateRoute>
              }
            />
            <Route
              path="/grimoire/:userId"
              element={
                <PrivateRoute>
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <UserGrimoire />
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
            {/* Default Route */}
            <Route path="*" element={<HomePage />} />
          </Routes>
        </AuthWrapper>
        <Astra />
      </NotificationProvider>
    </Router>
  );
};

export default App;
