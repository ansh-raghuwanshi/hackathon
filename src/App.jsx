import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Navbar from './components/layout/Navbar';

// Page placeholders
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Feed from './pages/Feed';
import ComplaintDetails from './pages/ComplaintDetails';
import CitizenDashboard from './pages/CitizenDashboard';
import OrganisationDashboard from './pages/OrganisationDashboard';
import NGODashboard from './pages/NGODashboard';
import AdminDashboard from './pages/AdminDashboard';
import MapPage from './pages/MapPage';
import Settings from './pages/Settings';

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
    </BrowserRouter>
  );
}
