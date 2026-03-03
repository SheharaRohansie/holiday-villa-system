import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: UserRole[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, roles }) => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (roles && user && !roles.includes(user.role)) {
    // Redirect to appropriate dashboard
    if (user.role === 'ADMIN') return <Navigate to="/admin/dashboard" replace />;
    if (user.role === 'STAFF') return <Navigate to="/staff/dashboard" replace />;
    return <Navigate to="/guest/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
