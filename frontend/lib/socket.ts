import { io, Socket } from 'socket.io-client';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3050';

class SocketClient {
  private socket: Socket | null = null;
  private static instance: SocketClient;

  private constructor() {
    // Singleton pattern - prevent direct instantiation
  }

  public static getInstance(): SocketClient {
    if (!SocketClient.instance) {
      SocketClient.instance = new SocketClient();
    }
    return SocketClient.instance;
  }

  public connect(): Socket {
    if (!this.socket || !this.socket.connected) {
      console.log('🔌 Connecting to Socket.IO server:', BACKEND_URL);

      this.socket = io(BACKEND_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5
      });

      this.socket.on('connect', () => {
        console.log('✅ Socket.IO connected:', this.socket?.id);
      });

      this.socket.on('disconnect', (reason) => {
        console.log('❌ Socket.IO disconnected:', reason);
      });

      this.socket.on('reconnect', (attemptNumber) => {
        console.log('🔄 Socket.IO reconnected after', attemptNumber, 'attempts');
      });

      this.socket.on('reconnect_error', (error) => {
        console.error('❌ Socket.IO reconnection error:', error);
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ Socket.IO connection error:', error);
      });
    }

    return this.socket;
  }

  public disconnect(): void {
    if (this.socket) {
      console.log('🔌 Disconnecting Socket.IO');
      this.socket.disconnect();
      this.socket = null;
    }
  }

  public getSocket(): Socket | null {
    return this.socket;
  }

  public subscribeToOrders(serverId: string): void {
    if (this.socket && this.socket.connected) {
      console.log('📦 Subscribing to orders updates for server:', serverId);
      this.socket.emit('subscribe:orders', { serverId });
    }
  }

  public unsubscribeFromOrders(serverId: string): void {
    if (this.socket && this.socket.connected) {
      console.log('📦 Unsubscribing from orders updates for server:', serverId);
      this.socket.emit('unsubscribe:orders', { serverId });
    }
  }
}

// Export singleton instance
const socketClient = SocketClient.getInstance();
export default socketClient;
