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
  const [serverData, setServerData] = useState<ServerData>({
    info: null,
    players: [],
    dynamic: null,
    lastUpdate: null
  });

  useEffect(() => {
    // Connect to Socket.io server on separate port
    const socketInstance = io('http://localhost:3052', {
      transports: ['websocket', 'polling']
    });

    socketInstance.on('connect', () => {
      console.log('Connected to Socket.io server');
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('Disconnected from Socket.io server');
      setIsConnected(false);
    });

    socketInstance.on('serverData', (data: ServerData) => {
      console.log('Received server data update:', data.lastUpdate);
      setServerData(data);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  return {
    socket,
    isConnected,
    serverData
  };
}