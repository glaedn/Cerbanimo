import "./App.css";
import * as React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import PrivateRoute from "./components/PrivateRoute.jsx";
//import Orbit from "./pages/Orbit.jsx";
//import IntentionPages from "./pages/IntentionPages.jsx";
import SiteNav from "./pages/SiteNav.jsx";
//import IntentionCreation from "./pages/IntentionCreation.jsx";
//import Intention from "./pages/Intention.jsx";
//import CapabilityTree from "./pages/CapabilityTree.jsx";
//import IntentionLotusMap from "./pages/IntentionLotusMap.jsx";
//import RealmCreation from "./pages/RealmCreation.jsx";
//import RealmHub from "./pages/RealmHub.jsx";
//import Realms from "./pages/Realms.jsx";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import AuthWrapper from "./AuthWrapper.jsx";
import { useIsMobile } from "./hooks/useIsMobile";
import { useUserProfile } from "./hooks/useUserProfile";
import { socketService } from "./services/SocketService";
import { useAuth0 } from "@auth0/auth0-react";
import MobileBottomNav from "./components/MobileBottomNav.jsx";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Toaster } from "react-hot-toast";

const ProfilePage = React.lazy(() => import("./pages/ProfilePage/ProfilePage.jsx"));
const SkillConstellation = React.lazy(() => import("./pages/SkillConstellation.jsx"));
const SkillLibrary = React.lazy(() => import("./pages/SkillLibrary.jsx"));
const InterestLibrary = React.lazy(() => import("./pages/InterestLibrary.jsx"));
const Dashboard = React.lazy(() => import("./pages/Dashboard.jsx"));
const PublicProfile = React.lazy(() => import("./pages/PublicProfile.jsx"));
const BadgeCreation = React.lazy(() => import("./pages/BadgeCreation.jsx"));
const HomePage = React.lazy(() => import("./pages/HomePage.jsx"));
const UserPortfolio = React.lazy(() => import("./pages/UserPortfolio.jsx"));
const GuildsDashboard = React.lazy(() => import("./pages/GuildsDashboard.jsx"));
const GuildHub = React.lazy(() => import("./pages/GuildHub.jsx"));
const ConstellationHub = React.lazy(() => import("./pages/ConstellationHub.jsx"));
const ResourcesDashboard = React.lazy(() => import("./pages/ResourcesDashboard.jsx"));
const GalacticActivityMap = React.lazy(() => import("./components/GalacticActivityMap/GalacticActivityMap.jsx"));
const OnboardingPage = React.lazy(() => import("./pages/OnboardingPage/OnboardingPage"));
const WaitingListPage = React.lazy(() => import("./pages/WaitingListPage.jsx"));
const Rezzler = React.lazy(() => import("./mobile/Rezzler.jsx"));
const MobileDashboard = React.lazy(() => import("./pages/MobileDashboard.jsx"));
const MobileNotifications = React.lazy(() => import("./pages/MobileNotifications.jsx"));
const MobileTaskDetail = React.lazy(() => import("./pages/MobileTaskDetail.jsx"));
const TaskBrowser = React.lazy(() => import("./pages/TaskBrowser.jsx"));
const TaskViewer = React.lazy(() => import("./components/TaskViewer.jsx"));
const CommunityMarketplace = React.lazy(() => import("./components/CommunityMarketplace/CommunityMarketplace.jsx"));
const ProjectVisualizer = React.lazy(() => import("./pages/ProjectVisualizer.jsx"));
const CommunityCreation = React.lazy(() => import("./pages/CommunityCreation.jsx"));
const CommunityHub = React.lazy(() => import("./pages/CommunityHub.jsx"));
const Communities = React.lazy(() => import("./pages/Communities.jsx"));
const ProjectCreation = React.lazy(() => import("./pages/ProjectCreation.jsx"));
const ProjectPages = React.lazy(() => import("./pages/ProjectPages.jsx"));
const Project = React.lazy(() => import("./pages/Project.jsx"));
const CoordinatorHUD = React.lazy(() => import("./pages/CoordinatorHUD.jsx"));
const ImpactAtlas = React.lazy(() => import("./pages/ImpactAtlas.jsx"));
const CivicKernelConsole = React.lazy(() => import("./pages/CivicKernelConsole.jsx"));
const DisputeCourt = React.lazy(() => import("./pages/DisputeCourt/DisputeCourt.jsx"));
const AdminDashboard = React.lazy(() => import("./pages/AdminDashboard.jsx"));
const NeedsPage = React.lazy(() => import("./pages/NeedsPage/NeedsPage.jsx"));
const AdaptiveHUD = React.lazy(() => import("./components/HUD/AdaptiveHUD.jsx"));
const GovernanceChamber = React.lazy(() => import("./pages/GovernanceChamber.jsx"));
const ConstitutionExplorer = React.lazy(() => import("./pages/ConstitutionExplorer.jsx"));
const FederationAtlas = React.lazy(() => import("./pages/FederationAtlas.jsx"));
const DelegationMapPage = React.lazy(() => import("./pages/DelegationMapPage.jsx"));
const CivicSimulator = React.lazy(() => import("./pages/CivicSimulator.jsx"));
const MediationSpace = React.lazy(() => import("./pages/MediationSpace.jsx"));

const AdminProtectedRoute = ({ children }) => {
  const { profile, loading } = useUserProfile();

  if (loading) {
    return <div className="hub-loader" style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00f3ff', fontFamily: 'Orbitron' }}>VERIFYING_ACCESS...</div>;
  }

  if (profile && Number(profile.id) === Number(15)) {
    return children;
  }

  // Render HomePage as if the route didn't resolve
  return <HomePage />;
} ;

const PageWrapper = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, x: 10 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -10 }}
    transition={{ duration: 0.2 }}
    style={{ width: "100%" }}
  >
    {children}
  </motion.div>
);

const AppContent = () => {
  const isMobile = useIsMobile();
  const location = useLocation();
  const { profile } = useUserProfile();
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();

  React.useEffect(() => {
    const initializeSocket = async () => {
      if (isAuthenticated && profile?.id) {
        try {
          const token = await getAccessTokenSilently();
          socketService.connect(profile.id, token);
        } catch (err) {
          console.error("Socket initialization failed:", err);
        }
      }
    };

    initializeSocket();

    return () => {
      socketService.disconnect();
    };
  }, [isAuthenticated, profile?.id, getAccessTokenSilently]);

  return (
    <div className="App">
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1C1C1E',
            color: '#FFFFFF',
            border: '1px solid #00F3FF',
            fontFamily: 'Orbitron, sans-serif',
            boxShadow: '0 0 15px rgba(0, 243, 255, 0.3)',
            fontSize: '0.9rem',
          },
          success: {
            iconTheme: {
              primary: '#00F3FF',
              secondary: '#1C1C1E',
            },
          },
          error: {
            style: {
              border: '1px solid #FF4136',
              boxShadow: '0 0 15px rgba(255, 65, 54, 0.3)',
            },
            iconTheme: {
              primary: '#FF4136',
              secondary: '#FFFFFF',
            },
          },
        }}
      />
      {isMobile ? <MobileBottomNav /> : <SiteNav />}
      <AuthWrapper>
        <React.Suspense fallback={<div className="hub-loader" style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00f3ff', fontFamily: 'Orbitron' }}>INITIALIZING_HUD...</div>}>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
          {/* Skill Constellation defined at the top */}
          <Route
            path="/profile/skill-constellation/:userId?"
            element={
              <PrivateRoute>
                <PageWrapper><SkillConstellation /></PageWrapper>
              </PrivateRoute>
            }
          />
          <Route
            path="/governance/:communityId/simulator"
            element={
              <PrivateRoute>
                <PageWrapper><CivicSimulator /></PageWrapper>
              </PrivateRoute>
            }
          />
          <Route
            path="/governance/:communityId/mediation"
            element={
              <PrivateRoute>
                <PageWrapper><MediationSpace /></PageWrapper>
              </PrivateRoute>
            }
          />
          <Route
            path="/governance/:communityId"
            element={
              <PrivateRoute>
                <PageWrapper><GovernanceChamber /></PageWrapper>
              </PrivateRoute>
            }
          />
          <Route
            path="/governance/:communityId/constitution"
            element={
              <PrivateRoute>
                <PageWrapper><ConstitutionExplorer /></PageWrapper>
              </PrivateRoute>
            }
          />
          <Route
            path="/governance/:communityId/delegation"
            element={
              <PrivateRoute>
                <PageWrapper><DelegationMapPage /></PageWrapper>
              </PrivateRoute>
            }
          />
          <Route
            path="/federation-atlas"
            element={
              <PrivateRoute>
                <PageWrapper><FederationAtlas /></PageWrapper>
              </PrivateRoute>
            }
          />
          <Route
            path="/needs/:needId?"
            element={
              <PrivateRoute>
                <PageWrapper><NeedsPage /></PageWrapper>
              </PrivateRoute>
            }
          />
          <Route
            path="/profile/skill-library"
            element={
              <PrivateRoute>
                <PageWrapper><SkillLibrary /></PageWrapper>
              </PrivateRoute>
            }
          />
          <Route
            path="/profile/interest-library"
            element={
              <PrivateRoute>
                <PageWrapper><InterestLibrary /></PageWrapper>
              </PrivateRoute>
            }
          />

          {/* Public Routes */}
          <Route path="/login" element={<PageWrapper><LoginPage /></PageWrapper>} />
          <Route path="/waiting-list" element={<PageWrapper><WaitingListPage /></PageWrapper>} />

          {/* Private Routes */}
          <Route
            path="/onboarding"
            element={
              <PrivateRoute>
                <PageWrapper><OnboardingPage /></PageWrapper>
              </PrivateRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <PrivateRoute>
                <PageWrapper><MobileNotifications /></PageWrapper>
              </PrivateRoute>
            }
          />
          <Route
            path="/profile/skill-constellation"
            element={
              <PrivateRoute>
                <PageWrapper><SkillConstellation /></PageWrapper>
              </PrivateRoute>
            }
          />
          <Route
            path="/tasks"
            element={
              <PrivateRoute>
                <PageWrapper><TaskBrowser /></PageWrapper>
              </PrivateRoute>
            }
          />
          <Route
            path="/guilds/:id"
            element={
              <PrivateRoute>
                <PageWrapper><GuildHub /></PageWrapper>
              </PrivateRoute>
            }
          />
          <Route
            path="/resources-inventory"
            element={
              <PrivateRoute>
                <PageWrapper><ResourcesDashboard /></PageWrapper>
              </PrivateRoute>
            }
          />
          <Route
            path="/guilds"
            element={
              <PrivateRoute>
                <PageWrapper><GuildsDashboard /></PageWrapper>
              </PrivateRoute>
            }
          />
          <Route
            path="/constellations"
            element={
              <PrivateRoute>
                <PageWrapper><ConstellationHub /></PageWrapper>
              </PrivateRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <PageWrapper>{isMobile ? <MobileDashboard /> : <Dashboard />}</PageWrapper>
              </PrivateRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <PrivateRoute>
                <PageWrapper><ProfilePage /></PageWrapper>
              </PrivateRoute>
            }
          />
          <Route path="/profile/public/:userId" element={<PageWrapper><PublicProfile /></PageWrapper>} />

          <Route
            path="/BadgeCreation"
            element={
              <PrivateRoute>
                <PageWrapper><BadgeCreation /></PageWrapper>
              </PrivateRoute>
            }
          />
           <Route
            path="/projects"
            element={
              <PrivateRoute>
                <PageWrapper><ProjectPages /></PageWrapper>
              </PrivateRoute>
            }
          />
          <Route
            path="/projectcreation"
            element={
              <PrivateRoute>
                <PageWrapper><ProjectCreation /></PageWrapper>
              </PrivateRoute>
            }
          />
          <Route
            path="/project/:projectId"
            element={
              <PrivateRoute>
                <PageWrapper><Project /></PageWrapper>
              </PrivateRoute>
            }
          />
          <Route
            path="/communitycreation"
            element={
              <PrivateRoute>
                <PageWrapper><CommunityCreation /></PageWrapper>
              </PrivateRoute>
            }
          />
          <Route
            path="/communityhub/:communityId"
            element={
              <PrivateRoute>
                <PageWrapper><CommunityHub /></PageWrapper>
              </PrivateRoute>
            }
          />
          <Route
            path="/communities"
            element={
              <PrivateRoute>
                <PageWrapper><Communities /></PageWrapper>
              </PrivateRoute>
            }
          />
          <Route
            path="/Visualizer/:projectId"
            element={
              <PrivateRoute>
                <PageWrapper><ProjectVisualizer /></PageWrapper>
              </PrivateRoute>
            }
          />
          <Route
            path="/Visualizer/:projectId/:taskId"
            element={
              <PrivateRoute>
                <PageWrapper>{isMobile ? <MobileTaskDetail /> : <ProjectVisualizer />}</PageWrapper>
              </PrivateRoute>
            }
          />
          <Route
            path="/userportfolio/:userId"
            element={
                <PageWrapper>
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <UserPortfolio />
                  </LocalizationProvider>
                </PageWrapper>
            }
          />
          {/* New Route for Galactic Activity Map */}
          <Route
            path="/activity-map"
            element={
              <PrivateRoute>
                <PageWrapper><GalacticActivityMap /></PageWrapper>
              </PrivateRoute>
            }
          />
          <Route
            path="/marketplace"
            element={
              <PrivateRoute>
                <PageWrapper><CommunityMarketplace /></PageWrapper>
              </PrivateRoute>
            }
          />
          <Route path="/rezzler" element={<PageWrapper><Rezzler /></PageWrapper>} />
          <Route
            path="/impact-atlas"
            element={
              <PrivateRoute>
                <PageWrapper><ImpactAtlas /></PageWrapper>
              </PrivateRoute>
            }
          />
          <Route
            path="/civic-kernel"
            element={
              <PrivateRoute>
                <PageWrapper><CivicKernelConsole /></PageWrapper>
              </PrivateRoute>
            }
          />
          <Route
            path="/dispute-court"
            element={
              <PrivateRoute>
                <PageWrapper><DisputeCourt /></PageWrapper>
              </PrivateRoute>
            }
          />
          <Route
            path="/admin-dashboard"
            element={
              <PrivateRoute>
                <AdminProtectedRoute>
                  <PageWrapper><AdminDashboard /></PageWrapper>
                </AdminProtectedRoute>
              </PrivateRoute>
            }
          />
          {/* Default Route */}
          <Route path="*" element={<PageWrapper><HomePage /></PageWrapper>} />
          </Routes>
        </AnimatePresence>
        </React.Suspense>
      </AuthWrapper>
    </div>
  );
};

const App = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  );
};

export default App;
