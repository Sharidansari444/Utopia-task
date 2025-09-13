import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [deviceUpdates, setDeviceUpdates] = useState([]);
  const [telemetryUpdates, setTelemetryUpdates] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    if (user && !socket) {
      // Initialize socket connection only if user exists and no socket is active
      const socketUrl = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';
      const newSocket = io(socketUrl, {
        auth: {
          token: localStorage.getItem('token')
        },
        transports: ['websocket', 'polling'],
        forceNew: false,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });

      // Connection event handlers
      newSocket.on('connect', () => {
        console.log('✅ Connected to server');
        setConnected(true);
        toast.success('Connected to real-time updates', {
          duration: 2000,
          icon: '🔌'
        });
      });

      newSocket.on('disconnect', () => {
        console.log('🔌 Disconnected from server');
        setConnected(false);
        toast.error('Disconnected from real-time updates', {
          duration: 2000,
          icon: '🔌'
        });
      });

      newSocket.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error);
        setConnected(false);
      });

      // Device update handlers
      newSocket.on('device:update', (data) => {
        console.log('📱 Device update received:', data);
        setDeviceUpdates(prev => {
          const updated = [...prev];
          const existingIndex = updated.findIndex(update => update.deviceId === data.deviceId);
          
          if (existingIndex >= 0) {
            updated[existingIndex] = { ...data, timestamp: new Date() };
          } else {
            updated.push({ ...data, timestamp: new Date() });
          }
          
          // Keep only last 50 updates
          return updated.slice(-50);
        });
      });

      // Telemetry update handlers
      newSocket.on('telemetry:new', (data) => {
        console.log('📊 New telemetry received:', data);
        setTelemetryUpdates(prev => {
          const updated = [{ ...data, timestamp: new Date() }, ...prev];
          // Keep only last 100 updates
          return updated.slice(0, 100);
        });

        // Show toast notification for new readings
        if (data.data) {
          toast.success(
            `New reading from ${data.deviceId}: ${data.data.temperature}°C, ${data.data.humidity}% RH`,
            {
              duration: 3000,
              icon: '📊'
            }
          );
        }
      });

      // System notifications
      newSocket.on('system:notification', (data) => {
        console.log('🔔 System notification:', data);
        
        switch (data.type) {
          case 'device_online':
            toast.success(`Device ${data.deviceId} is now online`, {
              icon: '🟢'
            });
            break;
          case 'device_offline':
            toast.error(`Device ${data.deviceId} went offline`, {
              icon: '🔴'
            });
            break;
          case 'alert':
            toast.error(data.message, {
              icon: '⚠️',
              duration: 5000
            });
            break;
          default:
            toast(data.message, {
              icon: '🔔'
            });
        }
      });

      setSocket(newSocket);

      // Cleanup on unmount
      return () => {
        console.log('🧹 Cleaning up socket connection');
        newSocket.disconnect();
        setSocket(null);
        setConnected(false);
      };
    } else if (!user && socket) {
      // Disconnect when user logs out
      console.log('🔓 User logged out, disconnecting socket');
      socket.disconnect();
      setSocket(null);
      setConnected(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Helper functions
  const emitEvent = (event, data) => {
    if (socket && connected) {
      socket.emit(event, data);
    } else {
      console.warn('Socket not connected, cannot emit event:', event);
    }
  };

  const subscribeToDevice = (deviceId) => {
    if (socket && connected) {
      socket.emit('subscribe:device', { deviceId });
      console.log(`📱 Subscribed to device: ${deviceId}`);
    }
  };

  const unsubscribeFromDevice = (deviceId) => {
    if (socket && connected) {
      socket.emit('unsubscribe:device', { deviceId });
      console.log(`📱 Unsubscribed from device: ${deviceId}`);
    }
  };

  const clearUpdates = () => {
    setDeviceUpdates([]);
    setTelemetryUpdates([]);
  };

  const getLatestTelemetryForDevice = (deviceId) => {
    return telemetryUpdates.find(update => update.deviceId === deviceId);
  };

  const getDeviceStatus = (deviceId) => {
    const deviceUpdate = deviceUpdates.find(update => update.deviceId === deviceId);
    if (!deviceUpdate) return 'unknown';
    
    const timeDiff = new Date() - new Date(deviceUpdate.lastSeen || deviceUpdate.timestamp);
    const minutesAgo = timeDiff / (1000 * 60);
    
    if (minutesAgo < 5) return 'online';
    if (minutesAgo < 30) return 'warning';
    return 'offline';
  };

  const value = {
    socket,
    connected,
    deviceUpdates,
    telemetryUpdates,
    emitEvent,
    subscribeToDevice,
    unsubscribeFromDevice,
    clearUpdates,
    getLatestTelemetryForDevice,
    getDeviceStatus
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};