/**
 * hooks/useSocket.ts
 * Enterprise Socket.io hook with Single Active Device Session Enforcement.
 */

import { useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '../constants/Config';
import { useAuth } from '../context/AuthContext';

export function useSocket() {
  const { token, user, logout } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!token || !user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', (reason) => {
      setIsConnected(false);
    });

    // Single Active Device Session Listener:
    // Kicks out previous active session if account is logged in on another device
    socket.on('force_logout', ({ reason }: { reason: string }) => {
      Alert.alert(
        'Session Terminated',
        reason || 'Your account was logged into from another device.',
        [
          {
            text: 'OK',
            onPress: () => logout(),
          },
        ]
      );
      logout();
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [token, user, logout]);

  return { socket: socketRef.current, isConnected };
}
