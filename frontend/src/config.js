/**
 * Application Configuration
 * 
 * This file contains all the configuration settings for the application.
 * For environment-specific configurations, use .env files or environment variables.
 */

// Helper to safely read env vars in Vite (import.meta.env) and fallback if present
const getEnv = (name) => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && name in import.meta.env) {
      return import.meta.env[name];
    }
  } catch {}
  try {
    if (typeof window !== 'undefined' && window.__APP_ENV__ && name in window.__APP_ENV__) {
      return window.__APP_ENV__[name];
    }
  } catch {}
  try {
    if (typeof process !== 'undefined' && process.env && name in process.env) {
      return process.env[name];
    }
  } catch {}
  return undefined;
};

// Base API URL - can be overridden by environment variables
// Prefer Vite-style `VITE_API_BASE_URL`, but also support legacy names
const API_BASE_URL =
  getEnv('VITE_API_BASE_URL') ||
  getEnv('VITE_API_URL') ||
  getEnv('REACT_APP_API_URL') ||
  'http://localhost:8000/api';

// Derive a sensible default WS base from API_BASE_URL
const deriveWsBase = (apiUrl) => {
  try {
    const u = new URL(apiUrl);
    const scheme = u.protocol === 'https:' ? 'wss://' : 'ws://';
    return `${scheme}${u.host}/ws`;
  } catch {
    return 'ws://localhost:8000/ws';
  }
};

// WebSocket URL - for real-time updates (prefer explicit env), support legacy var name
const WS_ENV = getEnv('VITE_WS_URL') || getEnv('VITE_WEBSOCKET_URL') || getEnv('REACT_APP_WS_URL') || getEnv('REACT_APP_WEBSOCKET_URL');
const WS_BASE_URL = WS_ENV || deriveWsBase(API_BASE_URL);

// WebSocket updates URL
const WS_UPDATES_URL = `${WS_BASE_URL}/updates`;

// Application settings
const APP_CONFIG = {
  // Application metadata
  APP_NAME: 'CyberIntel-X',
  APP_VERSION: '1.0.0',
  APP_DESCRIPTION: 'Advanced Security Operations Center Platform',
  
  // API Configuration
  API: {
    BASE_URL: API_BASE_URL,
    TIMEOUT: 30000, // 30 seconds
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000, // 1 second
    
    // Endpoints
    ENDPOINTS: {
      AUTH: {
        LOGIN: '/auth/token',
        REFRESH: '/auth/refresh',
        LOGOUT: '/auth/logout',
        ME: '/auth/me',
        REGISTER: '/auth/register',
        FORGOT_PASSWORD: '/auth/forgot-password',
        RESET_PASSWORD: '/auth/reset-password',
      },
      THREATS: '/threats',
      ALERTS: '/alerts',
      VULNERABILITIES: '/vulnerabilities',
      ASSETS: '/assets',
      REPORTS: '/reports',
      SETTINGS: '/settings',
      INTEGRATIONS: '/integrations',
      USERS: '/users',
      ROLES: '/roles',
    },
  },
  
  // WebSocket Configuration
  WS: {
    BASE_URL: WS_BASE_URL,
    RECONNECT_INTERVAL: 5000, // 5 seconds
    MAX_RECONNECT_ATTEMPTS: 5,
    
    // WebSocket channels/events
    CHANNELS: {
      ALERTS: '/ws/alerts',
      THREATS: '/ws/threats',
      VULNERABILITIES: '/ws/vulnerabilities',
      SYSTEM: '/ws/system',
    },
  },
  
  // Feature flags
  FEATURES: {
    ENABLE_ANALYTICS: getEnv('VITE_ENABLE_ANALYTICS') === 'true' || getEnv('REACT_APP_ENABLE_ANALYTICS') === 'true',
    ENABLE_DEBUG: (typeof import.meta !== 'undefined' && import.meta.env && !!import.meta.env.DEV) || false,
    ENABLE_REGISTRATION: (getEnv('VITE_ENABLE_REGISTRATION') ?? getEnv('REACT_APP_ENABLE_REGISTRATION')) !== 'false',
    ENABLE_SOCIAL_LOGIN: getEnv('VITE_ENABLE_SOCIAL_LOGIN') === 'true' || getEnv('REACT_APP_ENABLE_SOCIAL_LOGIN') === 'true',
  },
  
  // UI Configuration
  UI: {
    THEME: {
      DEFAULT: 'light', // 'light' or 'dark'
      SAVE_TO_LOCAL_STORAGE: true,
    },
    
    // Layout settings
    LAYOUT: {
      DRAWER_WIDTH: 240,
      MINI_DRAWER_WIDTH: 64,
      HEADER_HEIGHT: 64,
      FOOTER_HEIGHT: 48,
    },
    
    // Table settings
    TABLE: {
      ROWS_PER_PAGE_OPTIONS: [10, 25, 50, 100],
      DEFAULT_ROWS_PER_PAGE: 10,
    },
    
    // Notifications
    NOTIFICATION: {
      AUTO_HIDE_DURATION: 5000, // 5 seconds
      MAX_SNACKBAR: 5,
    },
  },
  
  // Map configuration
  MAP: {
    TILE_LAYER_URL: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    ATTRIBUTION: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    DEFAULT_ZOOM: 2,
    DEFAULT_CENTER: [20, 0],
  },
  
  // Date & Time
  DATETIME: {
    FORMAT: {
      DATE: 'YYYY-MM-DD',
      TIME: 'HH:mm:ss',
      DATETIME: 'YYYY-MM-DD HH:mm:ss',
      HUMAN_READABLE: 'MMM D, YYYY h:mm A',
    },
    TIMEZONE: 'UTC',
  },
  
  // Security
  SECURITY: {
    PASSWORD: {
      MIN_LENGTH: 8,
      REQUIRE_UPPERCASE: true,
      REQUIRE_LOWERCASE: true,
      REQUIRE_NUMBERS: true,
      REQUIRE_SPECIAL_CHARS: true,
    },
    SESSION: {
      TIMEOUT: 30 * 60 * 1000, // 30 minutes in milliseconds
      WARNING_TIME: 5 * 60 * 1000, // 5 minutes before timeout
    },
  },
  
  // External services
  EXTERNAL_SERVICES: {
    VIRUS_TOTAL: {
      BASE_URL: 'https://www.virustotal.com/api/v3',
      API_KEY: getEnv('VITE_VIRUS_TOTAL_API_KEY') || getEnv('REACT_APP_VIRUS_TOTAL_API_KEY') || '',
    },
    ABUSEIPDB: {
      BASE_URL: 'https://api.abuseipdb.com/api/v2',
      API_KEY: getEnv('VITE_ABUSEIPDB_API_KEY') || getEnv('REACT_APP_ABUSEIPDB_API_KEY') || '',
    },
    SHODAN: {
      BASE_URL: 'https://api.shodan.io',
      API_KEY: getEnv('VITE_SHODAN_API_KEY') || getEnv('REACT_APP_SHODAN_API_KEY') || '',
    },
  },
  
  // Default values
  DEFAULTS: {
    THREAT: {
      SEVERITY: 'medium',
      STATUS: 'new',
    },
    ALERT: {
      SEVERITY: 'medium',
      STATUS: 'open',
    },
  },
};

// Export the configuration
export default APP_CONFIG;

// Export commonly used values for easier imports
export {
  API_BASE_URL,
  WS_BASE_URL,
  WS_UPDATES_URL,
};
