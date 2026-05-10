import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import { Layout } from './components/Layout';
import { AuthGuard } from './components/AuthGuard';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import MonitorPage from './pages/MonitorPage';
import ClassDetailPage from './pages/ClassDetailPage';
import SchedulePage from './pages/SchedulePage';
import ReportsPage from './pages/ReportsPage';
import ClassManagementPage from './pages/ClassManagementPage';
import TeacherManagementPage from './pages/TeacherManagementPage';
import ParentPage from './pages/ParentPage';
import AdminManagementPage from './pages/AdminManagementPage';
import SystemPage from './pages/SystemPage';
import NotificationsPage from './pages/NotificationsPage';
import NotFoundPage from './pages/NotFoundPage';
import ForbiddenPage from './pages/ForbiddenPage';

function ProtectedLayout() {
  return (
    <AuthGuard>
      <Layout />
    </AuthGuard>
  );
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/forbidden',
    element: <ForbiddenPage />,
  },
  {
    path: '/',
    element: <ProtectedLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <DashboardPage />,
      },
      {
        path: 'monitor/:classId?',
        element: <MonitorPage />,
      },
      {
        path: 'classes',
        element: (
          <AuthGuard allowedRoles={['admin']}>
            <ClassManagementPage />
          </AuthGuard>
        ),
      },
      {
        path: 'classes/:classId',
        element: <ClassDetailPage />,
      },
      {
        path: 'schedule',
        element: <SchedulePage />,
      },
      {
        path: 'reports',
        element: (
          <AuthGuard allowedRoles={['admin', 'teacher']}>
            <ReportsPage />
          </AuthGuard>
        ),
      },
      {
        path: 'teachers',
        element: (
          <AuthGuard allowedRoles={['admin']}>
            <TeacherManagementPage />
          </AuthGuard>
        ),
      },
      {
        path: 'admin',
        element: (
          <AuthGuard allowedRoles={['admin']}>
            <AdminManagementPage />
          </AuthGuard>
        ),
      },
      {
        path: 'system',
        element: (
          <AuthGuard allowedRoles={['admin']}>
            <SystemPage />
          </AuthGuard>
        ),
      },
      {
        path: 'notifications',
        element: <NotificationsPage />,
      },
      {
        path: 'parent',
        element: (
          <AuthGuard allowedRoles={['parent', 'admin']}>
            <ParentPage />
          </AuthGuard>
        ),
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);
