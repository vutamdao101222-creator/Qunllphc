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
import NotFoundPage from './pages/NotFoundPage';

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
        path: 'monitor',
        element: <MonitorPage />,
      },
      {
        path: 'monitor/:classId',
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
