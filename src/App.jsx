import "./App.css";
import * as React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import PrivateRoute from "./components/PrivateRoute.jsx";
//import Orbit from "./pages/Orbit.jsx";
//import IntentionPages from "./pages/IntentionPages.jsx";
import MusicController from "./components/MusicController.jsx";
import SceneRouter from "./audio/SceneRouter";
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
import SpaceShell from "./components/SpaceShell.jsx";
import ExperienceShell from "./components/ExperienceShell/ExperienceShell.jsx";
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
const NarrativeIdentityHub = React.lazy(() => import("./pages/NarrativeIdentityHub.jsx"));

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

const OrbitPage = React.lazy(() => import("./pages/Orbit/OrbitPage.jsx"));
const MissionsPage = React.lazy(() => import("./pages/Missions/MissionsPage.jsx"));
const CommonsPage = React.lazy(() => import("./pages/Commons/CommonsPage.jsx"));
const SignalsPage = React.lazy(() => import("./pages/Signals/SignalsPage.jsx"));

const PageWrapper = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: 14, filter: "blur(8px)" }}
    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
    exit={{ opacity: 0, y: -10, filter: "blur(8px)" }}
    transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    style={{ width: "100%" }}
  >
    {children}
  </motion.div>
);

const AppContent = () => {
  const isMobile = useIsMobile();
  const location = useLocation();
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();
  const { profile } = useUserProfile();

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
    <SpaceShell>
      <div className="App">
        <MusicController />
        <SceneRouter />
      <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'rgba(5, 16, 34, 0.92)',
              color: '#FFFFFF',
              border: '1px solid rgba(95, 240, 255, 0.45)',
              fontFamily: 'Orbitron, sans-serif',
              boxShadow: '0 0 24px rgba(95, 240, 255, 0.28)',
              backdropFilter: 'blur(16px)',
              fontSize: '0.9rem',
            },
            success: {
              iconTheme: {
                primary: '#5FF0FF',
                secondary: '#081429',
              },
            },
            error: {
              style: {
                border: '1px solid #FF5CA2',
                boxShadow: '0 0 24px rgba(255, 92, 162, 0.28)',
              },
              iconTheme: {
                primary: '#FF5CA2',
                secondary: '#FFFFFF',
              },
            },
          }}
        />
        <AuthWrapper>
          <ExperienceShell>
            <React.Suspense fallback={<div className="hub-loader" style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5ff0ff', fontFamily: 'Orbitron' }}>INITIALIZING_HUD...</div>}>
              <AnimatePresence mode="wait">
                <Routes location={location} key={location.pathname}>
              {/* ORBIT MODE */}
              <Route path="/orbit/*" element={<PrivateRoute><PageWrapper><OrbitPage /></PageWrapper></PrivateRoute>}>
                  <Route path="focus" element={isMobile ? <MobileDashboard /> : <Dashboard />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="skills/:userId?" element={<SkillConstellation />} />
                <Route path="skill-library" element={<SkillLibrary />} />
                <Route path="interest-library" element={<InterestLibrary />} />
                <Route path="narrative-hub/:userId?" element={<NarrativeIdentityHub />} />
                <Route path="notifications" element={<MobileNotifications />} />
                  <Route index element={<div className="orbit-index-placeholder" style={{ display: 'none' }}>Index is handled by OrbitPage layout</div>} />
              </Route>

              {/* MISSIONS MODE */}
              <Route path="/missions/*" element={<PrivateRoute><PageWrapper><MissionsPage /></PageWrapper></PrivateRoute>}>
                <Route path="projects" element={<ProjectPages />} />
                <Route path="project/:projectId" element={<Project />} />
                <Route path="projectcreation" element={<ProjectCreation />} />
                <Route path="tasks" element={<TaskBrowser />} />
                <Route path="visualizer/:projectId/:taskId?" element={isMobile ? <MobileTaskDetail /> : <ProjectVisualizer />} />
                <Route index element={<ProjectPages />} />
              </Route>

              {/* COMMONS MODE */}
              <Route path="/commons/*" element={<PrivateRoute><PageWrapper><CommonsPage /></PageWrapper></PrivateRoute>}>
                <Route path="communities" element={<Communities />} />
                <Route path="community/:communityId" element={<CommunityHub />} />
                <Route path="communitycreation" element={<CommunityCreation />} />
                <Route path="marketplace" element={<CommunityMarketplace />} />
                <Route path="needs/:needId?" element={<NeedsPage />} />
                <Route path="guilds" element={<GuildsDashboard />} />
                <Route path="guild/:id" element={<GuildHub />} />
                <Route index element={<Communities />} />
              </Route>

              {/* SIGNALS MODE */}
              <Route path="/signals/*" element={<PrivateRoute><PageWrapper><SignalsPage /></PageWrapper></PrivateRoute>}>
                <Route path="governance/:communityId" element={<GovernanceChamber />} />
                <Route path="governance/:communityId/simulator" element={<CivicSimulator />} />
                <Route path="governance/:communityId/mediation" element={<MediationSpace />} />
                <Route path="governance/:communityId/constitution" element={<ConstitutionExplorer />} />
                <Route path="governance/:communityId/delegation" element={<DelegationMapPage />} />
                <Route path="impact" element={<ImpactAtlas />} />
                <Route path="federation" element={<FederationAtlas />} />
                <Route path="activity-map" element={<GalacticActivityMap />} />
                <Route index element={<CivicKernelConsole />} />
              </Route>

              {/* LEGACY / COMPATIBILITY REDIRECTS */}
              <Route path="/dashboard" element={<PrivateRoute><PageWrapper><OrbitPage /></PageWrapper></PrivateRoute>} />
              <Route path="/profile" element={<PrivateRoute><PageWrapper><ProfilePage /></PageWrapper></PrivateRoute>} />
              <Route path="/projects" element={<PrivateRoute><PageWrapper><ProjectPages /></PageWrapper></PrivateRoute>} />
              <Route path="/tasks" element={<PrivateRoute><PageWrapper><TaskBrowser /></PageWrapper></PrivateRoute>} />
              <Route path="/communities" element={<PrivateRoute><PageWrapper><Communities /></PageWrapper></PrivateRoute>} />

              {/* Public Routes */}
              <Route path="/login" element={<PageWrapper><LoginPage /></PageWrapper>} />
              <Route path="/waiting-list" element={<PageWrapper><WaitingListPage /></PageWrapper>} />
              <Route path="/onboarding" element={<PrivateRoute><PageWrapper><OnboardingPage /></PageWrapper></PrivateRoute>} />

              <Route path="/admin-dashboard" element={
                <PrivateRoute>
                  <AdminProtectedRoute>
                    <PageWrapper><AdminDashboard /></PageWrapper>
                  </AdminProtectedRoute>
                </PrivateRoute>
              } />

              <Route path="/userportfolio/:userId" element={
                <PageWrapper>
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <UserPortfolio />
                  </LocalizationProvider>
                </PageWrapper>
              } />

                  {/* Default Route */}
                  <Route path="*" element={<PageWrapper><HomePage /></PageWrapper>} />
                </Routes>
              </AnimatePresence>
            </React.Suspense>
          </ExperienceShell>
        </AuthWrapper>
      </div>
    </SpaceShell>
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
