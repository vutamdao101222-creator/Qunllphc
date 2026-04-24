import React from 'react';
import { RouterProvider } from 'react-router';
import { router } from './routes';
import { AuthProvider } from './context/AuthContext';
import { SchoolDataProvider } from './context/SchoolDataContext';

export default function App() {
  return (
    <AuthProvider>
      <SchoolDataProvider>
        <RouterProvider router={router} />
      </SchoolDataProvider>
    </AuthProvider>
  );
}
