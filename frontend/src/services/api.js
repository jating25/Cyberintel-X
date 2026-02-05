import axios from 'axios';
import { API_BASE_URL } from '../config';

// Create axios instance with base URL and headers
const api = axios.create({
  baseURL: API_BASE_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for cookies/session
});

// Request interceptor to add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle common errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Handle 401 Unauthorized errors
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Try to refresh the token
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, { refresh_token: refreshToken });
          const { access_token, refresh_token } = response.data;
          
          // Update tokens
          localStorage.setItem('token', access_token);
          if (refresh_token) {
            localStorage.setItem('refreshToken', refresh_token);
          }
          
          // Update the original request with the new token
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // If refresh fails, clear tokens and redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: async (username, password) => {
    // FastAPI OAuth2PasswordRequestForm expects form-encoded data
    const form = new URLSearchParams();
    form.append('username', username);
    form.append('password', password);
    const response = await api.post('/auth/token', form, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return response.data;
  },
  
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },
  
  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
  
  refreshToken: async (refreshToken) => {
    const response = await api.post('/auth/refresh', { refresh_token: refreshToken });
    return response.data;
  },
  
  forgotPassword: async (email) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },
  
  resetPassword: async (token, newPassword) => {
    const response = await api.post('/auth/reset-password', { token, new_password: newPassword });
    return response.data;
  },
  
  logout: async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      // Always remove tokens even if the API call fails
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
    }
  },
};

// Threat Intelligence API
export const threatAPI = {
  // Backwards-compatible helper used by hooks expecting { data, pagination }
  getAll: async (params = {}) => {
    const data = await threatAPI.getThreats(params);
    return {
      data,
      pagination: {
        total: data.length,
        pages: 1,
      },
    };
  },

  // Get all threats with pagination and filters
  getThreats: async (params = {}) => {
    const response = await api.get('/threats', { params });
    return response.data;
  },
  
  // Get a single threat by ID
  getThreatById: async (id) => {
    const response = await api.get(`/threats/${id}`);
    return response.data;
  },
  
  // Create a new threat
  createThreat: async (threatData) => {
    const response = await api.post('/threats', threatData);
    return response.data;
  },
  
  // Compatibility wrappers matching older hook naming
  create: async (threatData) => {
    return threatAPI.createThreat(threatData);
  },

  // Update a threat
  updateThreat: async (id, threatData) => {
    const response = await api.put(`/threats/${id}`, threatData);
    return response.data;
  },
  
  update: async (id, threatData) => {
    return threatAPI.updateThreat(id, threatData);
  },

  // Delete a threat
  deleteThreat: async (id) => {
    await api.delete(`/threats/${id}`);
  },

  delete: async (id) => {
    return threatAPI.deleteThreat(id);
  },
  
  // Get threat statistics
  getThreatStats: async () => {
    const response = await api.get('/threats/stats');
    return response.data;
  },
  
  // Get threat timeline data
  getThreatTimeline: async (params = {}) => {
    const response = await api.get('/threats/timeline', { params });
    return response.data;
  },
  
  // Geolocation endpoints
  getThreatsGeoJSON: async (params = {}) => {
    const response = await api.get('/threats/geojson', { params });
    return response.data;
  },
  
  getThreatLocations: async (params = {}) => {
    const response = await api.get('/threats/locations', { params });
    return response.data;
  },

  // Bulk helpers implemented client-side via multiple calls
  bulkUpdate: async (ids = [], updates = {}) => {
    if (!Array.isArray(ids) || ids.length === 0) return;
    await Promise.all(ids.map((id) => threatAPI.updateThreat(id, updates)));
  },

  bulkDelete: async (ids = []) => {
    if (!Array.isArray(ids) || ids.length === 0) return;
    await Promise.all(ids.map((id) => threatAPI.deleteThreat(id)));
  },

  // Simple export helper that returns raw data;
  // callers can format as needed on the client.
  export: async (format = 'json', selectedIds = []) => {
    const all = await threatAPI.getThreats({});
    const data =
      Array.isArray(selectedIds) && selectedIds.length
        ? all.filter((t) => selectedIds.includes(t.id || t._id))
        : all;

    if (format === 'csv') {
      const headers = Object.keys(data[0] || {});
      const rows = data.map((row) =>
        headers
          .map((key) => {
            const v = row[key];
            if (v == null) return '';
            const s = String(v).replace(/"/g, '""');
            return `"${s}"`;
          })
          .join(',')
      );
      const csv = [headers.join(','), ...rows].join('\n');
      return { data: csv };
    }

    return { data: JSON.stringify(data, null, 2) };
  },
};

// Alerts API
export const alertAPI = {
  // Get all alerts with pagination and filters
  getAlerts: async (params = {}) => {
    const response = await api.get('/alerts', { params });
    return response.data;
  },
  
  // Get a single alert by ID
  getAlertById: async (id) => {
    const response = await api.get(`/alerts/${id}`);
    return response.data;
  },
  
  // Update alert status (e.g., mark as read, resolved, etc.)
  updateAlertStatus: async (id, status) => {
    const response = await api.patch(`/alerts/${id}/status`, { status });
    return response.data;
  },
  
  // Get alert statistics
  getAlertStats: async () => {
    const response = await api.get('/alerts/stats');
    return response.data;
  },
  
  // Acknowledge multiple alerts
  acknowledgeAlerts: async (alertIds) => {
    const response = await api.post('/alerts/acknowledge', { alert_ids: alertIds });
    return response.data;
  },
};

// Vulnerabilities API
export const vulnerabilityAPI = {
  // Get all vulnerabilities with pagination and filters
  getVulnerabilities: async (params = {}) => {
    const response = await api.get('/vulnerabilities', { params });
    return response.data;
  },
  
  // Get a single vulnerability by ID
  getVulnerabilityById: async (id) => {
    const response = await api.get(`/vulnerabilities/${id}`);
    return response.data;
  },
  
  // Get vulnerability statistics
  getVulnerabilityStats: async () => {
    const response = await api.get('/vulnerabilities/stats');
    return response.data;
  },
  
  // Get CVSS score distribution
  getCvssDistribution: async () => {
    const response = await api.get('/vulnerabilities/cvss-distribution');
    return response.data;
  },
};

// Assets API
export const assetAPI = {
  // Get all assets with pagination and filters
  getAssets: async (params = {}) => {
    const response = await api.get('/assets', { params });
    return response.data;
  },
  
  // Get asset by ID
  getAssetById: async (id) => {
    const response = await api.get(`/assets/${id}`);
    return response.data;
  },
  
  // Update asset details
  updateAsset: async (id, assetData) => {
    const response = await api.put(`/assets/${id}`, assetData);
    return response.data;
  },
  
  // Get asset statistics
  getAssetStats: async () => {
    const response = await api.get('/assets/stats');
    return response.data;
  },
};

// Reports API
export const reportAPI = {
  // Generate a new report
  generateReport: async (reportConfig) => {
    const response = await api.post('/reports/generate', reportConfig);
    return response.data;
  },
  
  // Get all reports with pagination and filters
  getReports: async (params = {}) => {
    const response = await api.get('/reports', { params });
    return response.data;
  },
  
  // Get a report by ID
  getReportById: async (id) => {
    const response = await api.get(`/reports/${id}`);
    return response.data;
  },
  
  // Delete a report
  deleteReport: async (id) => {
    await api.delete(`/reports/${id}`);
  },
  
  // Download report in specified format (PDF, CSV, etc.)
  downloadReport: async (id, format = 'pdf') => {
    const response = await api.get(`/reports/${id}/download`, {
      params: { format },
      responseType: 'blob',
    });
    return response.data;
  },
};

// Settings API
export const settingsAPI = {
  // Get user settings
  getUserSettings: async () => {
    const response = await api.get('/settings/user');
    return response.data;
  },
  
  // Update user settings
  updateUserSettings: async (settings) => {
    const response = await api.put('/settings/user', settings);
    return response.data;
  },
  
  // Get system settings (admin only)
  getSystemSettings: async () => {
    const response = await api.get('/settings/system');
    return response.data;
  },
  
  // Update system settings (admin only)
  updateSystemSettings: async (settings) => {
    const response = await api.put('/settings/system', settings);
    return response.data;
  },
};

// Integration API
export const integrationAPI = {
  // Get all integrations
  getIntegrations: async () => {
    const response = await api.get('/integrations');
    return response.data;
  },
  
  // Get integration by ID
  getIntegrationById: async (id) => {
    const response = await api.get(`/integrations/${id}`);
    return response.data;
  },
  
  // Create a new integration
  createIntegration: async (integrationData) => {
    const response = await api.post('/integrations', integrationData);
    return response.data;
  },
  
  // Update an integration
  updateIntegration: async (id, integrationData) => {
    const response = await api.put(`/integrations/${id}`, integrationData);
    return response.data;
  },
  
  // Delete an integration
  deleteIntegration: async (id) => {
    await api.delete(`/integrations/${id}`);
  },
  
  // Test an integration
  testIntegration: async (id) => {
    const response = await api.post(`/integrations/${id}/test`);
    return response.data;
  },
};

// User Management API (admin only)
export const userAPI = {
  // Get all users
  getUsers: async (params = {}) => {
    const response = await api.get('/users', { params });
    return response.data;
  },
  
  // Get user by ID
  getUserById: async (id) => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },
  
  // Create a new user
  createUser: async (userData) => {
    const response = await api.post('/users', userData);
    return response.data;
  },
  
  // Update a user
  updateUser: async (id, userData) => {
    const response = await api.put(`/users/${id}`, userData);
    return response.data;
  },
  
  // Delete a user
  deleteUser: async (id) => {
    await api.delete(`/users/${id}`);
  },
  
  // Update user roles
  updateUserRoles: async (id, roles) => {
    const response = await api.put(`/users/${id}/roles`, { roles });
    return response.data;
  },
};

// Role Management API (admin only)
export const roleAPI = {
  // Get all roles
  getRoles: async () => {
    const response = await api.get('/roles');
    return response.data;
  },
  
  // Get role by ID
  getRoleById: async (id) => {
    const response = await api.get(`/roles/${id}`);
    return response.data;
  },
  
  // Create a new role
  createRole: async (roleData) => {
    const response = await api.post('/roles', roleData);
    return response.data;
  },
  
  // Update a role
  updateRole: async (id, roleData) => {
    const response = await api.put(`/roles/${id}`, roleData);
    return response.data;
  },
  
  // Delete a role
  deleteRole: async (id) => {
    await api.delete(`/roles/${id}`);
  },
  
  // Get permissions
  getPermissions: async () => {
    const response = await api.get('/roles/permissions');
    return response.data;
  },
};

export default api;
