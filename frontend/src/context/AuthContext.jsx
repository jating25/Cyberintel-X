import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useSnackbar } from 'notistack';

// Create the auth context
export const AuthContext = createContext();

// Custom hook to use the auth context
export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  // Set up axios defaults and interceptors
  useEffect(() => {
    if (token) {
      // Set the auth token for any requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      // Fetch user data
      fetchUser();
    } else {
      setLoading(false);
    }

    // Clean up
    return () => {
      delete axios.defaults.headers.common['Authorization'];
    };
  }, [token]);

  // Fetch user data
  const fetchUser = async () => {
    try {
      const response = await axios.get('/api/health');
      // Provide both role (string) and roles (array) for compatibility with UI checks
      setUser({ username: 'admin', role: 'analyst', roles: ['analyst'], services: response.data?.services });
      setError(null);
    } catch (err) {
      handleAuthError(err);
    } finally {
      setLoading(false);
    }
  };

  // Login function
  const login = async (username, password) => {
    try {
      setLoading(true);
      const form = new URLSearchParams();
      form.append('username', username);
      form.append('password', password);
      const response = await axios.post('/api/auth/token', form, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      const { access_token, refresh_token } = response.data;
      localStorage.setItem('token', access_token);
      if (refresh_token) {
        localStorage.setItem('refreshToken', refresh_token);
      }
      setToken(access_token);
      // Optimistically set a minimal user so routes render immediately
      setUser({ username, role: 'analyst', roles: ['analyst'] });
      await fetchUser();
      navigate('/');
      enqueueSnackbar('Login successful', { variant: 'success' });
      return { success: true };
    } catch (err) {
      let message = 'An error occurred during login. Please try again.';
      if (err?.response?.data?.detail) message = err.response.data.detail;
      handleAuthError(err);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    // Clear token and user data
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    
    // Redirect to login
    navigate('/login');
    
    enqueueSnackbar('Logged out successfully', { variant: 'info' });
  };

  // Handle authentication errors
  const handleAuthError = (error) => {
    let message = 'An error occurred';
    
    if (error.response) {
      // Server responded with a status code outside the 2xx range
      const { status, data } = error.response;
      
      if (status === 401) {
        // Unauthorized - invalid token or credentials
        message = data.detail || 'Invalid credentials';
        // Clear invalid token
        if (localStorage.getItem('token')) {
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
        }
      } else if (status === 403) {
        // Forbidden - insufficient permissions
        message = 'You do not have permission to access this resource';
      } else if (status === 404) {
        // Not found
        message = 'Resource not found';
      } else if (status >= 500) {
        // Server error
        message = 'Server error. Please try again later.';
      } else {
        // Other errors
        message = data.detail || message;
      }
    } else if (error.request) {
      // Request was made but no response was received
      message = 'Unable to connect to the server. Please check your connection.';
    }
    
    setError(message);
    enqueueSnackbar(message, { variant: 'error' });
  };

  // Check if user is authenticated
  const isAuthenticated = !!user && !!token;

  // Check if user has specific role
  const hasRole = (role) => {
    if (!user || !user.roles) return false;
    return user.roles.includes(role);
  };

  // Context value
  const value = {
    user,
    token,
    loading,
    error,
    isAuthenticated,
    login,
    logout,
    hasRole,
    refreshUser: fetchUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
