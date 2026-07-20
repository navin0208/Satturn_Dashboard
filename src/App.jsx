import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import DashboardView from './pages/DashboardView';
import DeviceDetailView from './pages/DeviceDetailView';
import LoginPage from './pages/auth/LoginPage';
import ForgotPassword from './pages/auth/ForgotPassword';
import AdminUsersView from './pages/admin/AdminUsersView';
import AqmsSystemsView from './pages/admin/AqmsSystemsView';
import MyDevicesView from './pages/MyDevicesView';
import ReportsView from './pages/ReportsView';
import SettingsView from './pages/SettingsView';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';

import './index.css';

// Protected Route Wrapper
const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { user, loading } = useAuth();

  // 🧠 WAIT until auth is ready
  if (loading) {
    return <div style={{ color: 'white' }}>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && user.role !== 'ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Layout route that requires auth
const AuthenticatedLayout = () => {
  return (
    <ProtectedRoute>
      <DataProvider>
        <DashboardLayout />

      </DataProvider>
    </ProtectedRoute>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Protected Dashboard Routes */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          <Route path="/dashboard" element={<AuthenticatedLayout />}>
            <Route index element={<DashboardView />} />
            <Route path="device/:id" element={<DeviceDetailView />} />
            <Route path="admin/users" element={<ProtectedRoute requireAdmin><AdminUsersView /></ProtectedRoute>} />
            <Route path="admin/aqms-systems" element={<ProtectedRoute requireAdmin><AqmsSystemsView /></ProtectedRoute>} />

            {/* App Modules that are UI complete */}
            <Route path="my-devices" element={<MyDevicesView />} />
            <Route path="reports" element={<ReportsView />} />
            <Route path="locations" element={<div className="panel fade-in" style={{ padding: '32px', margin: '32px', display: 'flex', flexDirection: 'column', gap: 16 }}><h2>Locations Module</h2><p className="text-secondary">Interactive Map rendering block goes here.</p></div>} />
            <Route path="analytics" element={<div className="panel fade-in" style={{ padding: '32px', margin: '32px', display: 'flex', flexDirection: 'column', gap: 16 }}><h2>System Analytics</h2><p className="text-secondary">Advanced charting dashboard will render here.</p></div>} />
            <Route path="settings" element={<SettingsView />} />
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>

  );
}

export default App;
