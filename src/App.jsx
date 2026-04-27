import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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

// Lazy load other pages (non-critical)

// Admin Pages - Lazy load
const Players = lazy(() => import('./pages/admin/Players'));
const Coaches = lazy(() => import('./pages/admin/Coaches'));
const AssignPlayers = lazy(() => import('./pages/admin/AssignPlayers'));
const SessionCardManage = lazy(() => import('./pages/admin/SessionCardManage'));
const LearningPathwayBuilder = lazy(() => import('./pages/admin/LearningPathwayBuilder'));
const AddPathway = lazy(() => import('./pages/admin/AddPathway'));
const EditPathway = lazy(() => import('./pages/admin/EditPathway'));
const ViewPathway = lazy(() => import('./pages/admin/ViewPathway'));
const Rewards = lazy(() => import('./pages/admin/Rewards'));
const RedeemHistory = lazy(() => import('./pages/admin/RedeemHistory'));
const AdminProfile = lazy(() => import('./pages/admin/AdminProfile'));
const AdminViewSessionCard = lazy(() => import('./pages/admin/ViewSessionCard'));
const EditSessionCard = lazy(() => import('./pages/admin/EditSessionCard'));
const CustomCardGenerate = lazy(() => import('./pages/admin/customCardGenerate'));

// Coach Pages - Lazy load
const MyPlayers = lazy(() => import('./pages/coach/MyPlayers'));
const PlayerDetail = lazy(() => import('./pages/coach/PlayerDetail'));
const PlayerSessions = lazy(() => import('./pages/coach/PlayerSessions'));
const StartSession = lazy(() => import('./pages/coach/StartSession'));
const SessionDetail = lazy(() => import('./pages/coach/SessionDetail'));
const ViewSessionCard = lazy(() => import('./pages/coach/viewCompletedSessionCard'));
const PastSessions = lazy(() => import('./pages/coach/PastSessions'));
const CoachProfile = lazy(() => import('./pages/coach/CoachProfile'));

// Loading fallback component
const PageLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    <p>Loading...</p>
  </div>
);

function App() {
  const showUnauthorizedModal = useStore((state) => state.showUnauthorizedModal);
  const unauthorizedMessage = useStore((state) => state.unauthorizedMessage);
  const handleUnauthorizedLogout = useStore((state) => state.handleUnauthorizedLogout);
  const initializeInterceptors = useStore((state) => state.initializeInterceptors);
  
  useEffect(() => {
    // Initialize response interceptor on app startup
    initializeInterceptors();
  }, [initializeInterceptors]);
  
  useEffect(() => {
  }, [showUnauthorizedModal, unauthorizedMessage]);
  
  return (
    <Router>
      {showUnauthorizedModal}
      <UnauthorizedModal 
        isOpen={showUnauthorizedModal}
        onLogout={handleUnauthorizedLogout}
        message={unauthorizedMessage}
      />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Admin Routes */}
          <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><Dashboard /></ProtectedRoute>} />
          <Route path="/admin/profile" element={<ProtectedRoute requiredRole="admin"><AdminProfile /></ProtectedRoute>} />
          <Route path="/admin/players" element={<ProtectedRoute requiredRole="admin"><Players /></ProtectedRoute>} />
          <Route path="/admin/player-detail/:playerId" element={<ProtectedRoute requiredRole="admin"><PlayerDetail /></ProtectedRoute>} />
          <Route path="/admin/coaches" element={<ProtectedRoute requiredRole="admin"><Coaches /></ProtectedRoute>} />
          <Route path="/admin/assign-players" element={<ProtectedRoute requiredRole="admin"><AssignPlayers /></ProtectedRoute>} />
          <Route path="/admin/session-card" element={<ProtectedRoute requiredRole="admin"><SessionCardManage /></ProtectedRoute>} />
          <Route path="/admin/view-session-card/:id" element={<ProtectedRoute requiredRole="admin"><AdminViewSessionCard /></ProtectedRoute>} />
          <Route path="/admin/edit-session-card/:id" element={<ProtectedRoute requiredRole="admin"><EditSessionCard /></ProtectedRoute>} />
          <Route path="/admin/custom-generate-card" element={<ProtectedRoute requiredRole="admin"><CustomCardGenerate /></ProtectedRoute>} />
          <Route path="/admin/learning-pathway" element={<ProtectedRoute requiredRole="admin"><LearningPathwayBuilder /></ProtectedRoute>} />
          <Route path="/admin/learning-pathway/add" element={<ProtectedRoute requiredRole="admin"><AddPathway /></ProtectedRoute>} />
          <Route path="/admin/learning-pathway/:id/view" element={<ProtectedRoute requiredRole="admin"><ViewPathway /></ProtectedRoute>} />
          <Route path="/admin/learning-pathway/:id/edit" element={<ProtectedRoute requiredRole="admin"><EditPathway /></ProtectedRoute>} />
          <Route path="/admin/rewards" element={<ProtectedRoute requiredRole="admin"><Rewards /></ProtectedRoute>} />
          <Route path="/admin/redeem-history" element={<ProtectedRoute requiredRole="admin"><RedeemHistory /></ProtectedRoute>} />
          

          {/* Coach Routes */}
          <Route path="/coach" element={<ProtectedRoute requiredRole="coach"><Dashboard /></ProtectedRoute>} />
          <Route path="/coach/players" element={<ProtectedRoute requiredRole="coach"><MyPlayers /></ProtectedRoute>} />
          <Route path="/coach/player/:playerId" element={<ProtectedRoute requiredRole="coach"><PlayerDetail /></ProtectedRoute>} />
          <Route path="/coach/player/:playerId/sessions" element={<ProtectedRoute requiredRole="coach"><PlayerSessions /></ProtectedRoute>} />
          <Route path="/coach/start-session" element={<ProtectedRoute requiredRole="coach"><StartSession /></ProtectedRoute>} />
          <Route path="/coach/start-session/:playerId" element={<ProtectedRoute requiredRole="coach"><StartSession /></ProtectedRoute>} />
          <Route path="/coach/session/:sessionId" element={<ProtectedRoute requiredRole="coach"><SessionDetail /></ProtectedRoute>} />
          <Route path="/coach/view-completed-session/:sessionId" element={<ProtectedRoute requiredRole="coach"><ViewSessionCard /></ProtectedRoute>} />
          <Route path="/coach/past-sessions" element={<ProtectedRoute requiredRole="coach"><PastSessions /></ProtectedRoute>} />
          <Route path="/coach/profile" element={<ProtectedRoute requiredRole="coach"><CoachProfile /></ProtectedRoute>} />

          

          {/* Redirects and Error */}
          <Route path="/404" element={<NotFound />} />
          <Route path="/leaderboard" element={<LeaderBoard />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
