import React from 'react';
import { RouterProvider } from 'react-router';
import { router } from './routes';
import { AuthProvider } from './context/AuthContext';
import { SchoolDataProvider } from './context/SchoolDataContext';
import { Toaster } from 'sonner';
import GlobalFocusAnalyzer from './components/GlobalFocusAnalyzer';
import SpeakerAnnouncer from './components/SpeakerAnnouncer';

export default function App() {
  return (
    <AuthProvider>
      <SchoolDataProvider>
        <RouterProvider router={router} />
        <GlobalFocusAnalyzer />
        <SpeakerAnnouncer />
        <Toaster richColors position="top-right" />
      </SchoolDataProvider>
    </AuthProvider>
  );
}
