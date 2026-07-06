import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import './App.css';
import { UnauthorizedModal } from './components/UnauthorizedModal';
import { useStore } from './context/store';

// Preload public routes (critical)
import { Home } from './pages/common/Home';
import { Login } from './pages/common/Login';
import { Register } from './pages/common/Register';
import { NotFound } from './pages/common/NotFound';
import { ProtectedRoute } from './components/ProtectedRoute';

// Preload Dashboard & LeaderBoard (high traffic)
import Dashboard from './pages/common/Dashboard';
import LeaderBoard from './pages/common/LeaderBoard';

// Admin Pages - Lazy load
const Players = lazy(() => import('./pages/admin/Players'));
const Coaches = lazy(() => import('./pages/admin/Coaches'));
const AssignPlayers = lazy(() => import('./pages/admin/AssignPlayers'));
const SessionCardManage = lazy(() => import('./pages/admin/SessionCardManage'));
const LearningPathwayBuilder = lazy(() => import('./pages/admin/LearningPathwayBuilder'));
const AddPathway = lazy(() => import('./pages/admin/AddPathway'));
const ActivityEditor = lazy(() => import('./pages/admin/ActivityEditor'));
const EditPathway = lazy(() => import('./pages/admin/EditPathway'));
const ViewPathway = lazy(() => import('./pages/admin/ViewPathway'));
const Rewards = lazy(() => import('./pages/admin/Rewards'));
const RedeemHistory = lazy(() => import('./pages/admin/RedeemHistory'));
const AdminProfile = lazy(() => import('./pages/admin/AdminProfile'));
const AdminViewSessionCard = lazy(() => import('./pages/admin/ViewSessionCard'));
const EditSessionCard = lazy(() => import('./pages/admin/EditSessionCard'));
const CustomCardGenerate = lazy(() => import('./pages/admin/customCardGenerate'));
const Attendance = lazy(() => import('./pages/admin/Attendance'));
const ManageBatches = lazy(() => import('./pages/admin/ManageBatches'));
const BatchDetail = lazy(() => import('./pages/admin/BatchDetail'));

// Coach Pages - Lazy load
const CoachDashboard = lazy(() => import('./pages/coach/CoachDashboard'));
const MyPlayers = lazy(() => import('./pages/coach/MyPlayers'));
const PlayerDetail = lazy(() => import('./pages/coach/PlayerDetail'));
const PlayerSessions = lazy(() => import('./pages/coach/PlayerSessions'));
const StartSession = lazy(() => import('./pages/coach/StartSession'));
const BatchSessionView = lazy(() => import('./pages/coach/BatchSessionView'));
const SessionDetail = lazy(() => import('./pages/coach/SessionDetail'));
const ViewSessionCard = lazy(() => import('./pages/coach/viewCompletedSessionCard'));
const PastSessions = lazy(() => import('./pages/coach/PastSessions'));
const CoachProfile = lazy(() => import('./pages/coach/CoachProfile'));

const PageLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    <p>Loading...</p>
  </div>
);

function RootLayout() {
  const showUnauthorizedModal = useStore((state) => state.showUnauthorizedModal);
  const unauthorizedMessage = useStore((state) => state.unauthorizedMessage);
  const handleUnauthorizedLogout = useStore((state) => state.handleUnauthorizedLogout);
  const initializeInterceptors = useStore((state) => state.initializeInterceptors);

  useEffect(() => {
    initializeInterceptors();
  }, [initializeInterceptors]);

  return (
    <>
      <UnauthorizedModal
        isOpen={showUnauthorizedModal}
        onLogout={handleUnauthorizedLogout}
        message={unauthorizedMessage}
      />
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>
    </>
  );
}

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      // Public Routes
      { path: '/', element: <Home /> },
      { path: '/login', element: <Login /> },
      { path: '/register', element: <Register /> },
      { path: '/leaderboard', element: <LeaderBoard /> },
      { path: '/404', element: <NotFound /> },
      { path: '*', element: <NotFound /> },

      // Admin Routes
      { path: '/admin', element: <ProtectedRoute requiredRole="admin"><Dashboard /></ProtectedRoute> },
      { path: '/admin/profile', element: <ProtectedRoute requiredRole="admin"><AdminProfile /></ProtectedRoute> },
      { path: '/admin/players', element: <ProtectedRoute requiredRole="admin"><Players /></ProtectedRoute> },
      { path: '/admin/player-detail/:playerId', element: <ProtectedRoute requiredRole="admin"><PlayerDetail /></ProtectedRoute> },
      { path: '/admin/coaches', element: <ProtectedRoute requiredRole="admin"><Coaches /></ProtectedRoute> },
      { path: '/admin/assign-players', element: <ProtectedRoute requiredRole="admin"><AssignPlayers /></ProtectedRoute> },
      { path: '/admin/session-card', element: <ProtectedRoute requiredRoles={['admin','coach']}><SessionCardManage /></ProtectedRoute> },
      { path: '/admin/view-session-card/:id', element: <ProtectedRoute requiredRoles={['admin','coach']}><AdminViewSessionCard /></ProtectedRoute> },
      { path: '/admin/edit-session-card/:id', element: <ProtectedRoute requiredRoles={['admin','coach']}><EditSessionCard /></ProtectedRoute> },
      { path: '/admin/custom-generate-card', element: <ProtectedRoute requiredRoles={['admin','coach']}><CustomCardGenerate /></ProtectedRoute> },
      { path: '/admin/learning-pathway', element: <ProtectedRoute requiredRole="admin"><LearningPathwayBuilder /></ProtectedRoute> },
      { path: '/admin/learning-pathway/add', element: <ProtectedRoute requiredRole="admin"><AddPathway /></ProtectedRoute> },
      { path: '/admin/learning-pathway/add/activity', element: <ProtectedRoute requiredRoles={['admin','coach']}><ActivityEditor /></ProtectedRoute> },
      { path: '/admin/learning-pathway/:id/view', element: <ProtectedRoute requiredRole="admin"><ViewPathway /></ProtectedRoute> },
      { path: '/admin/learning-pathway/:id/edit', element: <ProtectedRoute requiredRole="admin"><EditPathway /></ProtectedRoute> },
      { path: '/admin/rewards', element: <ProtectedRoute requiredRole="admin"><Rewards /></ProtectedRoute> },
      { path: '/admin/redeem-history', element: <ProtectedRoute requiredRole="admin"><RedeemHistory /></ProtectedRoute> },
      { path: '/admin/attendance', element: <ProtectedRoute requiredRole="admin"><Attendance /></ProtectedRoute> },
      { path: '/admin/manage-batches', element: <ProtectedRoute requiredRoles={['admin','coach']}><ManageBatches /></ProtectedRoute> },
      { path: '/admin/batches/:batchId', element: <ProtectedRoute requiredRoles={['admin','coach']}><BatchDetail /></ProtectedRoute> },
      
      // Coach Routes
      { path: '/coach', element: <ProtectedRoute requiredRole="coach"><CoachDashboard /></ProtectedRoute> },
      { path: '/coach/players', element: <ProtectedRoute requiredRole="coach"><MyPlayers /></ProtectedRoute> },
      { path: '/coach/player/:playerId', element: <ProtectedRoute requiredRole="coach"><PlayerDetail /></ProtectedRoute> },
      { path: '/coach/player/:playerId/sessions', element: <ProtectedRoute requiredRole="coach"><PlayerSessions /></ProtectedRoute> },
      { path: '/coach/start-session', element: <ProtectedRoute requiredRole="coach"><StartSession /></ProtectedRoute> },
      { path: '/coach/start-session/:playerId', element: <ProtectedRoute requiredRole="coach"><StartSession /></ProtectedRoute> },
      { path: '/coach/batch-session', element: <ProtectedRoute requiredRole="coach"><BatchSessionView /></ProtectedRoute> },
      { path: '/coach/session/:sessionId', element: <ProtectedRoute requiredRole="coach"><SessionDetail /></ProtectedRoute> },
      { path: '/coach/view-completed-session/:sessionId', element: <ProtectedRoute requiredRole="coach"><ViewSessionCard /></ProtectedRoute> },
      { path: '/coach/past-sessions', element: <ProtectedRoute requiredRole="coach"><PastSessions /></ProtectedRoute> },
      { path: '/coach/profile', element: <ProtectedRoute requiredRole="coach"><CoachProfile /></ProtectedRoute> },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
