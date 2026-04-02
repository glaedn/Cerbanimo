import "./App.css";
import * as React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import PrivateRoute from "./components/PrivateRoute.jsx";
//import Orbit from "./pages/Orbit.jsx";
import ProfilePage from "./pages/ProfilePage/ProfilePage.jsx";
//import IntentionPages from "./pages/IntentionPages.jsx";
import SiteNav from "./pages/SiteNav.jsx";
//import IntentionCreation from "./pages/IntentionCreation.jsx";
//import Intention from "./pages/Intention.jsx";
//import CapabilityTree from "./pages/CapabilityTree.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import PublicProfile from "./pages/PublicProfile.jsx";
import BadgeCreation from "./pages/BadgeCreation.jsx";
import HomePage from "./pages/HomePage.jsx";
//import IntentionLotusMap from "./pages/IntentionLotusMap.jsx";
//import RealmCreation from "./pages/RealmCreation.jsx";
//import RealmHub from "./pages/RealmHub.jsx";
//import Realms from "./pages/Realms.jsx";
import UserPortfolio from "./pages/UserPortfolio.jsx";
import GuildsDashboard from "./pages/GuildsDashboard.jsx";
import ConstellationHub from "./pages/ConstellationHub.jsx";
import ResourcesDashboard from "./pages/ResourcesDashboard.jsx";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import GalacticActivityMap from "./components/GalacticActivityMap/GalacticActivityMap.jsx";
import OnboardingPage from "./pages/OnboardingPage/OnboardingPage";
import WaitingListPage from "./pages/WaitingListPage.jsx"; // Added import
//import CallTheCosmos from "./pages/CallTheCosmos.jsx";
import AuthWrapper from "./AuthWrapper.jsx";
//import RealmsMesh from "./pages/RealmsMesh.jsx";
//import ManifestationSession from "./pages/ManifestationSession.jsx";
//import AnalyticsDashboard from "./pages/AnalyticsDashboard.jsx";
import Rezzler from "./mobile/Rezzler.jsx";
import CommunityMarketplace from "./components/CommunityMarketplace/CommunityMarketplace.jsx";
import ProjectVisualizer from "./pages/ProjectVisualizer.jsx";
import CommunityCreation from "./pages/CommunityCreation.jsx";
import CommunityHub from "./pages/CommunityHub.jsx";
import Communities from "./pages/Communities.jsx";
import ProjectCreation from "./pages/ProjectCreation.jsx";
import ProjectPages from "./pages/ProjectPages.jsx";
import Project from "./pages/Project.jsx";
import CoordinatorHUD from "./pages/CoordinatorHUD.jsx";
import ImpactAtlas from "./pages/ImpactAtlas.jsx";
import DisputeCourt from "./pages/DisputeCourt/DisputeCourt.jsx";

const App = () => {
  return (
    <Router>
      <div className="App">
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
            path="/resources-inventory"
            element={
              <PrivateRoute>
                <ResourcesDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/guilds"
            element={
              <PrivateRoute>
                <GuildsDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/constellations"
            element={
              <PrivateRoute>
                <ConstellationHub />
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
            path="/profile"
            element={
              <PrivateRoute>
                <ProfilePage />
              </PrivateRoute>
            }
          />
          <Route path="/profile/public/:userId" element={<PublicProfile />} />

          <Route
            path="/BadgeCreation"
            element={
              <PrivateRoute>
                <BadgeCreation />
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
          <Route
            path="/marketplace"
            element={
              <PrivateRoute>
                <CommunityMarketplace />
              </PrivateRoute>
            }
          />
          <Route path="/rezzler" element={<Rezzler />} />
          <Route
            path="/coordinator-hud"
            element={
              <PrivateRoute>
                <CoordinatorHUD />
              </PrivateRoute>
            }
          />
          <Route
            path="/impact-atlas"
            element={
              <PrivateRoute>
                <ImpactAtlas />
              </PrivateRoute>
            }
          />
          <Route
            path="/dispute-court"
            element={
              <PrivateRoute>
                <DisputeCourt />
              </PrivateRoute>
            }
          />
          {/* Default Route */}
          <Route path="*" element={<HomePage />} />
          </Routes>
        </AuthWrapper>
      </div>
    </Router>
  );
};

export default App;
