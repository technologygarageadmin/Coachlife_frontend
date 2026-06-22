import { Navigate } from 'react-router-dom';
import { useStore } from '../context/store';
import { useState, useEffect } from 'react';

export const ProtectedRoute = ({ children, requiredRole, requiredRoles }) => {
  const { isAuthenticated, hasRole, hasAnyRole } = useStore();
  const [isReady, setIsReady] = useState(useStore.persist?.hasHydrated() ?? true);

  useEffect(() => {
    if (isReady) return;
    const unsub = useStore.persist.onFinishHydration(() => setIsReady(true));
    return () => unsub();
  }, [isReady]);

  if (!isReady) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><p>Loading...</p></div>;
  }

  // Check if user is authenticated after hydration
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check if user has the required role(s)
  // Support both single role (requiredRole) and multiple roles (requiredRoles array)
  if (requiredRole) {
    if (!hasRole(requiredRole)) {
      return <Navigate to="/404" replace />;
    }
  } else if (requiredRoles && Array.isArray(requiredRoles)) {
    if (!hasAnyRole(requiredRoles)) {
      return <Navigate to="/404" replace />;
    }
  }

  return children;
};
