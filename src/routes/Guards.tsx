import { Navigate } from 'react-router-dom';
import { useAuth } from '../providers/AuthProvider';
import type { UserRole } from '../types';
import type { ReactNode } from 'react';

export const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading, configured } = useAuth();
  if (!configured) {
    return <Navigate to="/login" replace />;
  }
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <span className="spinner" style={{ width: 24, height: 24 }} />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

export const RoleRoute = ({ roles, children }: { roles: UserRole[]; children: ReactNode }) => {
  const { profile, loading } = useAuth();
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <span className="spinner" style={{ width: 24, height: 24 }} />
      </div>
    );
  }
  if (!profile || !roles.includes(profile.role)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};