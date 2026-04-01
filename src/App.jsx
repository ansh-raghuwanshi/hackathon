import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Navbar from './components/layout/Navbar';

// Dynamically import pages to enable code splitting and avoid monolithic chunk initialization bugs
const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const Feed = lazy(() => import('./pages/Feed'));
const ComplaintDetails = lazy(() => import('./pages/ComplaintDetails'));
const CitizenDashboard = lazy(() => import('./pages/CitizenDashboard'));
const OrganisationDashboard = lazy(() => import('./pages/OrganisationDashboard'));
const NGODashboard = lazy(() => import('./pages/NGODashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const MapPage = lazy(() => import('./pages/MapPage'));
const Settings = lazy(() => import('./pages/Settings'));

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuthStore();
  
  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/signup" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" replace />;
  
  return children;
};

// Root redirect handler
const RootRedirect = () => {
  const { user, loading } = useAuthStore();
  
  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/signup" replace />;
  
  return <Navigate to={`/dashboard/${user.role.toLowerCase()}`} replace />;
};

// Simple loading fallback for lazy chunks
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div style={{ padding: '2rem', color: 'var(--text-subtle)' }}>Loading application module...</div>
  </div>
);

export default function App() {
  const initializeAuthListener = useAuthStore(state => state.initializeAuthListener);
  
  useEffect(() => {
    const unsubscribe = initializeAuthListener();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [initializeAuthListener]);

  return (
    <BrowserRouter>
      <Navbar />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/feed" element={<ProtectedRoute><Feed /></ProtectedRoute>} />
          <Route path="/complaint/:id" element={<ProtectedRoute><ComplaintDetails /></ProtectedRoute>} />
          <Route path="/map" element={<ProtectedRoute><MapPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

          {/* Dashboards */}
          <Route path="/dashboard/citizen" element={
            <ProtectedRoute allowedRoles={['Citizen']}>
              <CitizenDashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/dashboard/organisation" element={
            <ProtectedRoute allowedRoles={['Organisation']}>
              <OrganisationDashboard />
            </ProtectedRoute>
          } />
          <Route path="/dashboard/ngo" element={
            <ProtectedRoute allowedRoles={['NGO']}>
              <NGODashboard />
            </ProtectedRoute>
          } />
          <Route path="/dashboard/admin" element={
            <ProtectedRoute allowedRoles={['Admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
