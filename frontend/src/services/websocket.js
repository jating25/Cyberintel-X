import React from 'react';
import { v4 as uuidv4 } from 'uuid';
import { enqueueSnackbar } from 'notistack';
import { Button } from '@mui/material';
import { threatAPI } from './api';
import { WS_UPDATES_URL } from '../config';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 5000; // 5 seconds
    this.subscribers = new Map();
    this.messageQueue = [];
    this.pingInterval = null;
    this.connectionPromise = null;
    this.connectionResolvers = [];
    this.lastUrl = null;
  }

  /**
   * Initialize WebSocket connection
   * @param {string} url - WebSocket server URL
   * @returns {Promise<WebSocket>} - Resolves when connection is established
   */
  connect(url) {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        // Get the current access token
        const token = localStorage.getItem('token');
        
        // Append token as query parameter for authentication
        const wsUrl = new URL(url);
        if (token) {
          wsUrl.searchParams.append('token', token);
        }
        
        // Create WebSocket connection
        this.socket = new WebSocket(wsUrl.toString());
        this.lastUrl = wsUrl.toString();
        
        // Connection opened
        this.socket.onopen = (event) => {
          console.log('WebSocket connected');
          this.connected = true;
          this.reconnectAttempts = 0;
          
          // Start ping-pong to keep connection alive
          this.startPingPong();
          
          // Process any queued messages
          this.processMessageQueue();
          
          // Resolve all pending connection promises
          this.connectionResolvers.forEach(resolver => resolver(this.socket));
          this.connectionResolvers = [];
          
          resolve(this.socket);
        };
        
        // Listen for messages
        this.socket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };
        
        // Handle errors
        this.socket.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };
        
        // Handle connection close
        this.socket.onclose = (event) => {
          console.log(`WebSocket disconnected: ${event.code} ${event.reason}`);
          this.connected = false;
          this.stopPingPong();
          
          // Attempt to reconnect if not explicitly closed by the client
          if (event.code !== 1000) {
            this.handleReconnect();
          }
        };
      } catch (error) {
        console.error('Error creating WebSocket connection:', error);
        reject(error);
      }
    });
    
    return this.connectionPromise;
  }
  
  /**
   * Start ping-pong to keep connection alive
   */
  startPingPong() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    
    // Send ping every 30 seconds
    this.pingInterval = setInterval(() => {
      if (this.connected) {
        this.send({ type: 'ping' });
      }
    }, 30000);
  }
  
  /**
   * Stop ping-pong interval
   */
  stopPingPong() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }
  
  /**
   * Handle reconnection logic
   */
  handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      enqueueSnackbar('Disconnected from real-time updates. Please refresh the page to reconnect.', {
        variant: 'error',
        autoHideDuration: 10000,
      });
      return;
    }
    
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000); // Exponential backoff with max 30s
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      if (!this.connected) {
        const defaultUrl = (typeof window !== 'undefined')
          ? `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws/updates`
          : 'ws://localhost:8000/ws/updates';
        this.connect(this.lastUrl || WS_UPDATES_URL || defaultUrl);
      }
    }, delay);
  }
  
  /**
   * Close WebSocket connection
   */
  disconnect() {
    if (this.socket) {
      this.socket.close(1000, 'User initiated disconnect');
      this.socket = null;
      this.connected = false;
      this.stopPingPong();
      this.connectionPromise = null;
    }
  }
  
  /**
   * Send a message through the WebSocket
   * @param {Object} message - Message to send
   */
  send(message) {
    if (!this.connected) {
      // Queue the message if not connected
      this.messageQueue.push(message);
      return false;
    }
    
    try {
      this.socket.send(JSON.stringify({
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        ...message
      }));
      return true;
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
      return false;
    }
  }
  
  /**
   * Process any queued messages
   */
  processMessageQueue() {
    while (this.messageQueue.length > 0 && this.connected) {
      const message = this.messageQueue.shift();
      this.send(message);
    }
  }
  
  /**
   * Handle incoming WebSocket messages
   * @param {Object} message - Received message
   */
  handleMessage(message) {
    // Handle system messages
    if (message.type === 'pong') {
      return; // Ignore pong messages
    }
    
    // Handle error messages
    if (message.type === 'error') {
      console.error('WebSocket error:', message.error);
      enqueueSnackbar(message.error || 'An error occurred', { variant: 'error' });
      return;
    }
    
    // Handle notification messages
    if (message.type === 'notification') {
      this.handleNotification(message);
      return;
    }
    
    // Handle data sync messages
    if (message.type === 'sync') {
      this.handleSync(message);
      return;
    }
    
    // Notify subscribers for this message type
    const callbacks = this.subscribers.get(message.type) || [];
    callbacks.forEach(callback => {
      try {
        callback(message.data);
      } catch (error) {
        console.error(`Error in WebSocket subscriber for ${message.type}:`, error);
      }
    });
  }
  
  /**
   * Handle notification messages
   * @param {Object} message - Notification message
   */
  handleNotification(message) {
    const { level = 'info', title, content, action } = message.data || {};
    
    // Map WebSocket notification levels to Snackbar variants
    const variantMap = {
      success: 'success',
      info: 'info',
      warning: 'warning',
      error: 'error',
    };
    
    const variant = variantMap[level] || 'info';
    
    // Show notification
    try {
      enqueueSnackbar(content || title, {
        variant,
        autoHideDuration: level === 'error' ? 10000 : 5000,
        action: action
          ? React.createElement(
              Button,
              {
                color: 'inherit',
                size: 'small',
                onClick: () => {
                  if (action.onClick) {
                    action.onClick();
                  }
                },
              },
              action.label || 'View'
            )
          : null,
      });
    } catch (e) {
      console.error('Failed to show snackbar notification', e);
    }
    
    // Play notification sound for important alerts
    if (['warning', 'error'].includes(level)) {
      this.playNotificationSound();
    }
  }
  
  /**
   * Handle data sync messages
   * @param {Object} message - Sync message
   */
  handleSync(message) {
    const { collection, operation, data } = message.data || {};
    
    // Handle different types of sync operations
    switch (operation) {
      case 'create':
      case 'update':
      case 'delete':
        // Notify subscribers for this collection
        const callbacks = this.subscribers.get(`sync:${collection}`) || [];
        callbacks.forEach(callback => {
          try {
            callback({ operation, data });
          } catch (error) {
            console.error(`Error in sync subscriber for ${collection}:`, error);
          }
        });
        break;
        
      default:
        console.warn(`Unknown sync operation: ${operation}`);
    }
  }
  
  /**
   * Play notification sound
   */
  playNotificationSound() {
    try {
      // Create audio context
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioContext();
      
      // Create oscillator and gain node
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      // Configure oscillator
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(440, audioContext.currentTime + 0.1);
      
      // Configure gain (volume) envelope
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.2);
      
      // Connect nodes and start
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  }
  
  /**
   * Subscribe to WebSocket messages
   * @param {string} event - Event type to subscribe to
   * @param {Function} callback - Callback function
   * @returns {Function} - Unsubscribe function
   */
  subscribe(event, callback) {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, []);
    }
    
    const subscribers = this.subscribers.get(event);
    subscribers.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = subscribers.indexOf(callback);
      if (index !== -1) {
        subscribers.splice(index, 1);
      }
      
      if (subscribers.length === 0) {
        this.subscribers.delete(event);
      }
    };
  }
  
  /**
   * Subscribe to threat events
   * @param {Function} callback - Callback function for threat events
   * @returns {Function} - Unsubscribe function
   */
  subscribeToThreats(callback) {
    return this.subscribe('threat', callback);
  }
  
  /**
   * Subscribe to alert events
   * @param {Function} callback - Callback function for alert events
   * @returns {Function} - Unsubscribe function
   */
  subscribeToAlerts(callback) {
    return this.subscribe('alert', callback);
  }
  
  /**
   * Subscribe to sync events for a specific collection
   * @param {string} collection - Collection name (e.g., 'threats', 'alerts')
   * @param {Function} callback - Callback function for sync events
   * @returns {Function} - Unsubscribe function
   */
  subscribeToSync(collection, callback) {
    return this.subscribe(`sync:${collection}`, callback);
  }
  
  /**
   * Get the current connection status
   * @returns {boolean} - True if connected, false otherwise
   */
  isConnected() {
    return this.connected;
  }
  
  /**
   * Wait for connection to be established
   * @returns {Promise<WebSocket>} - Resolves with the WebSocket instance when connected
   */
  waitForConnection() {
    if (this.connected) {
      return Promise.resolve(this.socket);
    }
    
    return new Promise((resolve) => {
      this.connectionResolvers.push(resolve);
    });
  }
}

// Create a singleton instance
export const webSocketService = new WebSocketService();

// Initialize WebSocket connection when the module is loaded
if (typeof window !== 'undefined') {
  // Use the WebSocket URL from config
  import('../config').then(({ WS_UPDATES_URL }) => {
    const wsUrl = WS_UPDATES_URL; // Use the predefined updates URL
    webSocketService.connect(wsUrl).catch(error => {
      console.error('Failed to connect to WebSocket server:', error);
    });
    
    // Reconnect when the page becomes visible again
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && !webSocketService.isConnected()) {
        webSocketService.connect(wsUrl).catch(console.error);
      }
    });
  }).catch(err => {
    console.error('Error importing config:', err);
    // Fallback to default URL
    const wsUrl = 'ws://localhost:8000/ws/updates';
    webSocketService.connect(wsUrl).catch(error => {
      console.error('Failed to connect to WebSocket server:', error);
    });
  });
}

export default webSocketService;
