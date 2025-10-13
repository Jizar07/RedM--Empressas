import { useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';

interface ServerData {
  info: any;
  players: any[];
  dynamic: any;
  lastUpdate: string | null;
}

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [serverData, setServerData] = useState<ServerData>({
    info: null,
    players: [],
    dynamic: null,
    lastUpdate: null
  });

  useEffect(() => {
    console.log('🔌 Initializing Socket.IO connection to http://localhost:3052...');

    // Connect to Socket.io server on separate port
    const socketInstance = io('http://localhost:3052', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: 5, // Limited attempts since we have polling fallback
      timeout: 5000
    });

    socketInstance.on('connect', () => {
      console.log('✅ Socket.IO connected:', socketInstance.id);
      setIsConnected(true);
      setConnectionError(null);
      setReconnectAttempt(0);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('❌ Socket.IO disconnected:', reason);
      setIsConnected(false);

      if (reason === 'io server disconnect') {
        // Server disconnected us - try to reconnect
        console.log('🔄 Server disconnected, attempting reconnect...');
        socketInstance.connect();
      }
    });

    socketInstance.on('connect_error', (error) => {
      // Silently handle connection errors - we'll use polling fallback
      setConnectionError(error.message);
      setIsConnected(false);
    });

    socketInstance.on('reconnect', (attemptNumber) => {
      console.log(`✅ Socket.IO reconnected after ${attemptNumber} attempts`);
      setIsConnected(true);
      setConnectionError(null);
      setReconnectAttempt(0);
    });

    socketInstance.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 Socket.IO reconnection attempt ${attemptNumber}...`);
      setReconnectAttempt(attemptNumber);
    });

    socketInstance.on('reconnect_error', (error) => {
      // Silently handle reconnection errors - we'll use polling fallback
      setConnectionError(`Reconnect failed: ${error.message}`);
    });

    socketInstance.on('reconnect_failed', () => {
      // Silently handle failed reconnections - polling fallback is active
      setConnectionError('WebSocket unavailable - using polling');
    });

    socketInstance.on('serverData', (data: ServerData) => {
      console.log('📊 Received server data update:', data.lastUpdate);
      setServerData(data);
    });

    setSocket(socketInstance);

    return () => {
      console.log('🔌 Disconnecting Socket.IO...');
      socketInstance.off('connect');
      socketInstance.off('disconnect');
      socketInstance.off('connect_error');
      socketInstance.off('reconnect');
      socketInstance.off('reconnect_attempt');
      socketInstance.off('reconnect_error');
      socketInstance.off('reconnect_failed');
      socketInstance.off('serverData');
      socketInstance.disconnect();
    };
  }, []);

  return {
    socket,
    isConnected,
    connectionError,
    reconnectAttempt,
    serverData
  };
}