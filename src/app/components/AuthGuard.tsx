import React from 'react';
import { Navigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../context/AuthContext';

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="p-6 text-sm text-gray-500">Đang tải phiên đăng nhập...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
