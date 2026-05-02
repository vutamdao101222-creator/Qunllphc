import React from 'react';
import { RouterProvider } from 'react-router';
import { router } from './routes';
import { AuthProvider } from './context/AuthContext';
import { SchoolDataProvider } from './context/SchoolDataContext';
import { Toaster } from 'sonner';

export default function App() {
  return (
    <AuthProvider>
      <SchoolDataProvider>
        <RouterProvider router={router} />
        <Toaster richColors position="top-right" />
      </SchoolDataProvider>
    </AuthProvider>
  );
}
