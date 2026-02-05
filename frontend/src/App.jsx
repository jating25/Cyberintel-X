import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';
import { SnackbarProvider } from 'notistack';

// Layout Components
import Layout from './components/layout/Layout';

// Pages
import Dashboard from './pages/Dashboard';
import Threats from './pages/Threats';
import Login from './pages/Login';
import NotFound from './pages/NotFound';
import ThreatDetails from './pages/ThreatDetails';
import AlertDetails from './pages/AlertDetails';
import Alerts from './pages/Alerts';
import Analytics from './pages/Analytics';
import Reports from './pages/Reports';
import ReportSecurityPosture from './pages/reports/SecurityPosture';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import Logout from './pages/Logout';
// Security
import SecurityEndpoints from './pages/security/Endpoints';
import SecurityNetwork from './pages/security/Network';
import SecurityVulnerabilities from './pages/security/Vulnerabilities';
import SecurityIoc from './pages/security/Ioc';
// Admin
import AdminUsers from './pages/admin/Users';
import AdminIam from './pages/admin/Iam';
import AdminMonitoring from './pages/admin/Monitoring';
import AdminIntegrations from './pages/admin/Integrations';
// Help
import HelpDocs from './pages/help/Docs';
import HelpFeedback from './pages/help/Feedback';

// Context
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeContext } from './context/ThemeContext';

// Utils
import { getTheme } from './utils/theme';

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <div>Loading...</div>; // Or a loading spinner
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

function AppContent() {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : true;
  });
  
  const theme = createTheme(getTheme(darkMode));
  
  // Save theme preference to localStorage
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);
  
  const toggleDarkMode = () => setDarkMode((prev) => !prev);

  return (
    <ThemeContext.Provider value={{ darkMode, setDarkMode, toggleDarkMode }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <SnackbarProvider 
          maxSnack={3}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
        >
          <Router>
            <AuthProvider>
              <Routes>
                <Route path="/login" element={<Login />} />
                
                {/* Protected Routes */}
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <Layout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Dashboard />} />
                  <Route path="threats" element={<Threats />} />
                  <Route path="alerts" element={<Alerts />} />
                  <Route path="analytics" element={<Analytics />} />
                  <Route path="reports" element={<Reports />} />
                  <Route path="reports/security-posture" element={<ReportSecurityPosture />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="profile" element={<Profile />} />
                  <Route path="logout" element={<Logout />} />

                  {/* Detail Routes */}
                  <Route path="threats/:id" element={<ThreatDetails />} />
                  <Route path="alerts/:id" element={<AlertDetails />} />

                  {/* Security */}
                  <Route path="security">
                    <Route index element={<Navigate to="endpoints" replace />} />
                    <Route path="endpoints" element={<SecurityEndpoints />} />
                    <Route path="network" element={<SecurityNetwork />} />
                    <Route path="vulnerabilities" element={<SecurityVulnerabilities />} />
                    <Route path="ioc" element={<SecurityIoc />} />
                  </Route>

                  {/* Admin */}
                  <Route path="admin">
                    <Route index element={<Navigate to="users" replace />} />
                    <Route path="users" element={<AdminUsers />} />
                    <Route path="iam" element={<AdminIam />} />
                    <Route path="monitoring" element={<AdminMonitoring />} />
                    <Route path="integrations" element={<AdminIntegrations />} />
                  </Route>

                  {/* Help */}
                  <Route path="help">
                    <Route index element={<Navigate to="docs" replace />} />
                    <Route path="docs" element={<HelpDocs />} />
                    <Route path="feedback" element={<HelpFeedback />} />
                  </Route>
                  {/* Fallback inside protected area */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
                
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AuthProvider>
          </Router>
        </SnackbarProvider>
      </ThemeProvider>
    </ThemeContext.Provider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;
