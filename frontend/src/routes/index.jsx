import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';

// Layout
import Layout from '../components/layout/Layout';

// Pages
const Dashboard = lazy(() => import('../pages/Dashboard'));
const Login = lazy(() => import('../pages/Login'));
const Register = lazy(() => import('../pages/Register'));
const ForgotPassword = lazy(() => import('../pages/ForgotPassword'));
const ResetPassword = lazy(() => import('../pages/ResetPassword'));
const Profile = lazy(() => import('../pages/Profile'));
const Settings = lazy(() => import('../pages/Settings'));
const Threats = lazy(() => import('../pages/Threats'));
const ThreatDetails = lazy(() => import('../pages/ThreatDetails'));
const Alerts = lazy(() => import('../pages/Alerts'));
const AlertDetails = lazy(() => import('../pages/AlertDetails'));
const Vulnerabilities = lazy(() => import('../pages/Vulnerabilities'));
const VulnerabilityDetails = lazy(() => import('../pages/VulnerabilityDetails'));
const Assets = lazy(() => import('../pages/Assets'));
const AssetDetails = lazy(() => import('../pages/AssetDetails'));
const Reports = lazy(() => import('../pages/Reports'));
const ReportDetails = lazy(() => import('../pages/ReportDetails'));
const Integrations = lazy(() => import('../pages/Integrations'));
const Users = lazy(() => import('../pages/Users'));
const UserDetails = lazy(() => import('../pages/UserDetails'));
const Roles = lazy(() => import('../pages/Roles'));
const RoleDetails = lazy(() => import('../pages/RoleDetails'));
const NotFound = lazy(() => import('../pages/NotFound'));
const Unauthorized = lazy(() => import('../pages/Unauthorized'));

// Loading component
const Loading = () => (
  <Box 
    display="flex" 
    justifyContent="center" 
    alignItems="center" 
    minHeight="100vh"
  >
    <CircularProgress />
  </Box>
);

// Protected Route component
const ProtectedRoute = ({ children, requiredRoles = [] }) => {
  const { isAuthenticated, user, loading } = useAuth();
  
  if (loading) {
    return <Loading />;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  // Check if user has required roles
  if (requiredRoles.length > 0 && !requiredRoles.some(role => user?.roles?.includes(role))) {
    return <Navigate to="/unauthorized" replace />;
  }
  
  return children;
};

// Public Route component
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <Loading />;
  }
  
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

// App Routes
const AppRoutes = () => {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        } />
        
        <Route path="/register" element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        } />
        
        <Route path="/forgot-password" element={
          <PublicRoute>
            <ForgotPassword />
          </PublicRoute>
        } />
        
        <Route path="/reset-password/:token" element={
          <PublicRoute>
            <ResetPassword />
          </PublicRoute>
        } />
        
        <Route path="/unauthorized" element={<Unauthorized />} />
        
        {/* Protected Routes */}
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Dashboard />} />
          
          {/* Profile & Settings */}
          <Route path="profile" element={<Profile />} />
          <Route path="settings" element={<Settings />} />
          
          {/* Security */}
          <Route path="threats">
            <Route index element={<Threats />} />
            <Route path=":id" element={<ThreatDetails />} />
          </Route>
          
          <Route path="alerts">
            <Route index element={<Alerts />} />
            <Route path=":id" element={<AlertDetails />} />
          </Route>
          
          <Route path="vulnerabilities">
            <Route index element={<Vulnerabilities />} />
            <Route path=":id" element={<VulnerabilityDetails />} />
          </Route>
          
          <Route path="assets">
            <Route index element={<Assets />} />
            <Route path=":id" element={<AssetDetails />} />
          </Route>
          
          <Route path="reports">
            <Route index element={<Reports />} />
            <Route path=":id" element={<ReportDetails />} />
          </Route>
          
          <Route path="integrations" element={
            <ProtectedRoute requiredRoles={['admin']}>
              <Integrations />
            </ProtectedRoute>
          } />
          
          {/* Admin Routes */}
          <Route path="users">
            <Route index element={
              <ProtectedRoute requiredRoles={['admin']}>
                <Users />
              </ProtectedRoute>
            } />
            <Route path=":id" element={
              <ProtectedRoute requiredRoles={['admin']}>
                <UserDetails />
              </ProtectedRoute>
            } />
          </Route>
          
          <Route path="roles">
            <Route index element={
              <ProtectedRoute requiredRoles={['admin']}>
                <Roles />
              </ProtectedRoute>
            } />
            <Route path=":id" element={
              <ProtectedRoute requiredRoles={['admin']}>
                <RoleDetails />
              </ProtectedRoute>
            } />
          </Route>
          
          {/* Catch all route */}
          <Route path="*" element={<NotFound />} />
        </Route>
        
        {/* Catch all other routes */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
