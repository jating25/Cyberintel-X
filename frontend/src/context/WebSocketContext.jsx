import React, { createContext, useContext, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { webSocketService } from '../services/websocket';
import { useAuth } from './AuthContext';
import { enqueueSnackbar } from 'notistack';

// Create WebSocket context
const WebSocketContext = createContext(null);

export const WebSocketProvider = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const subscribersRef = useRef(new Map());
  const reconnectTimerRef = useRef(null);
  const isMounted = useRef(true);

  // Handle WebSocket messages
  const handleMessage = useCallback((message) => {
    if (!message || !message.type) return;

    // Get all subscribers for this message type
    const callbacks = subscribersRef.current.get(message.type) || [];
    
    // Call each subscriber
    callbacks.forEach(callback => {
      try {
        callback(message.data);
      } catch (error) {
        console.error(`Error in WebSocket subscriber for ${message.type}:`, error);
      }
    });
  }, []);

  // Handle connection status changes
  const handleConnectionChange = useCallback((isConnected) => {
    if (!isMounted.current) return;
    
    const status = isConnected ? 'connected' : 'disconnected';
    console.log(`WebSocket ${status}`);
    
    // Notify subscribers of connection status change
    const callbacks = subscribersRef.current.get('connection:status') || [];
    callbacks.forEach(callback => callback({ isConnected }));
    
    // Show notification for disconnection
    if (!isConnected) {
      enqueueSnackbar('Disconnected from real-time updates. Reconnecting...', {
        variant: 'warning',
        autoHideDuration: 5000,
      });
    } else {
      enqueueSnackbar('Reconnected to real-time updates', {
        variant: 'success',
        autoHideDuration: 3000,
      });    
    }
  }, []);

  // Initialize WebSocket connection
  const initWebSocket = useCallback(async () => {
    if (!isAuthenticated || !isMounted.current) return;
    
    try {
      // Connect to WebSocket server
      await webSocketService.waitForConnection();
      
      // Subscribe to connection status changes
      webSocketService.subscribe('connection:status', handleConnectionChange);
      
      // Subscribe to threat events
      webSocketService.subscribe('threat', (data) => {
        handleMessage({ type: 'threat', data });
      });
      
      // Subscribe to alert events
      webSocketService.subscribe('alert', (data) => {
        handleMessage({ type: 'alert', data });
      });
      
      // Subscribe to sync events
      webSocketService.subscribe('sync', (data) => {
        handleMessage({ type: `sync:${data.collection}`, data });
      });
      
      // Notify that connection is established
      handleConnectionChange(true);
      
    } catch (error) {
      console.error('Failed to initialize WebSocket:', error);
      handleConnectionChange(false);
      
      // Schedule reconnection
      if (isMounted.current && isAuthenticated) {
        reconnectTimerRef.current = setTimeout(initWebSocket, 5000);
      }
    }
  }, [isAuthenticated, handleMessage, handleConnectionChange]);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  // Effect to handle WebSocket connection on mount and auth changes
  useEffect(() => {
    isMounted.current = true;
    
    if (isAuthenticated) {
      initWebSocket();
    } else {
      cleanup();
    }
    
    return () => {
      isMounted.current = false;
      cleanup();
    };
  }, [isAuthenticated, initWebSocket, cleanup]);

  // Subscribe to WebSocket events
  const subscribe = useCallback((event, callback) => {
    if (!event || typeof callback !== 'function') {
      console.error('Invalid subscription parameters');
      return () => {};
    }
    
    // Add callback to subscribers map
    if (!subscribersRef.current.has(event)) {
      subscribersRef.current.set(event, new Set());
    }
    
    const callbacks = subscribersRef.current.get(event);
    callbacks.add(callback);
    
    // Return unsubscribe function
    return () => {
      if (subscribersRef.current.has(event)) {
        const callbacks = subscribersRef.current.get(event);
        callbacks.delete(callback);
        
        if (callbacks.size === 0) {
          subscribersRef.current.delete(event);
        }
      }
    };
  }, []);

  // Send message through WebSocket
  const send = useCallback((type, data) => {
    if (!type) {
      console.error('Message type is required');
      return false;
    }
    
    return webSocketService.send({
      type,
      data: {
        ...data,
        userId: user?.id,
        timestamp: new Date().toISOString(),
      },
    });
  }, [user]);

  // Check if WebSocket is connected
  const isConnected = useCallback(() => {
    return webSocketService.isConnected();
  }, []);

  // Context value
  const value = {
    subscribe,
    send,
    isConnected,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

WebSocketProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

// Custom hook to use WebSocket context
export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

export default WebSocketContext;
