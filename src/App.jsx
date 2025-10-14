import "./App.css";
import * as React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import PrivateRoute from "./components/PrivateRoute.jsx";
import Orbit from "./pages/Orbit.jsx";
import ProfilePage from "./pages/ProfilePage/ProfilePage.jsx";
import IntentionPages from "./pages/IntentionPages.jsx";
import SiteNav from "./pages/SiteNav.jsx";
import IntentionCreation from "./pages/IntentionCreation.jsx";
import Intention from "./pages/Intention.jsx";
import CapabilityTree from "./pages/CapabilityTree.jsx";
import RewardDashboard from "./pages/RewardDashboard.jsx";
import PublicProfile from "./pages/PublicProfile.jsx";
import BadgeCreation from "./pages/BadgeCreation.jsx";
import HomePage from "./pages/HomePage.jsx";
import IntentionLotusMap from "./pages/IntentionLotusMap.jsx";
import RealmCreation from "./pages/RealmCreation.jsx";
import RealmHub from "./pages/RealmHub.jsx";
import Realms from "./pages/Realms.jsx";
import UserPortfolio from "./pages/UserPortfolio.jsx";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import GalacticActivityMap from "./components/GalacticActivityMap/GalacticActivityMap.jsx";
import OnboardingPage from "./pages/OnboardingPage/OnboardingPage";
import WaitingListPage from "./pages/WaitingListPage.jsx"; // Added import
import CallTheCosmos from "./pages/CallTheCosmos.jsx";
import AuthWrapper from "./AuthWrapper.jsx";
import RealmsMesh from "./pages/RealmsMesh.jsx";

const App = () => {
  return (
    <Router>
      <SiteNav />
      <AuthWrapper>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/waiting-list" element={<WaitingListPage />} /> {/* Added route */}

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
            path="/orbit"
            element={
              <PrivateRoute>
                <Orbit />
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
            path="/declare-intention"
            element={
              <PrivateRoute>
                <IntentionCreation />
              </PrivateRoute>
            }
          />
          <Route
            path="/intention/:intentionId"
            element={
              <PrivateRoute>
                <Intention />
              </PrivateRoute>
            }
          />
          <Route path="/profile/public/:userId" element={<PublicProfile />} />
          <Route
            path="/profile/capability-tree"
            element={
              <PrivateRoute>
                <CapabilityTree />
              </PrivateRoute>
            }
          />
          <Route
            path="/form-new-realm"
            element={
              <PrivateRoute>
                <RealmCreation />
              </PrivateRoute>
            }
          />
          <Route
            path="/realm/:realmId"
            element={
              <PrivateRoute>
                <RealmHub />
              </PrivateRoute>
            }
          />
          <Route
            path="/realms"
            element={
              <PrivateRoute>
                <Realms />
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
            path="/lotus-map/:intentionId"
            element={
              <PrivateRoute>
                <IntentionLotusMap />
              </PrivateRoute>
            }
          />
          <Route
            path="/lotus-map/:intentionId/:petalId"
            element={
              <PrivateRoute>
                <IntentionLotusMap />
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
          <Route
            path="/call-the-cosmos"
            element={
              <PrivateRoute>
                <CallTheCosmos />
              </PrivateRoute>
            }
          />
          <Route
            path="/realms-mesh"
            element={
              <PrivateRoute>
                <RealmsMesh />
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
