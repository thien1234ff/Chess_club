import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import type { UserRole } from '../../types';
import Spinner from '../ui/Spinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles
}) => {
  const { currentUser, isLoading } = useAuth();

  // If auth state is still loading, show full page spinner to avoid layout shift
  if (isLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-charcoal gap-4">
        <Spinner size="lg" />
        <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500 font-display">ChessHub Securing Session...</p>
      </div>
    );
  }

  // Redirect to Authentication if not logged in
  if (!currentUser) {
    return <Navigate to="/auth" replace />;
  }

  // Check role authorization
  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    console.warn(`Access denied for role ${currentUser.role}. Allowed: ${allowedRoles.join(', ')}`);
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
export default ProtectedRoute;
