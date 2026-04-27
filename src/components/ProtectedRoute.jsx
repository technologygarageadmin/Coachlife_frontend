import { Navigate } from 'react-router-dom';
import { useStore } from '../context/store';
import { useEffect, useState } from 'react';

export const ProtectedRoute = ({ children, requiredRole, requiredRoles }) => {
  const { isAuthenticated, hasRole, hasAnyRole } = useStore();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Check if localStorage has persisted auth data
    const checkHydration = () => {
      try {
        localStorage.getItem('coachlife-store');
        setIsReady(true);
      } catch (error) {
        console.error('Error checking hydration:', error);
        setIsReady(true);
      }
    };

    // Use a small delay to ensure Zustand persist middleware has run
    const timer = setTimeout(checkHydration, 10);
    return () => clearTimeout(timer);
  }, []);

  // Wait for Zustand to finish hydrating from localStorage
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
