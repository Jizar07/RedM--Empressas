// Global SSE client manager
class SSEManager {
  private static instance: SSEManager;
  private clients: Set<ReadableStreamDefaultController>;

  private constructor() {
    this.clients = new Set();
  }

  static getInstance(): SSEManager {
    if (!SSEManager.instance) {
      SSEManager.instance = new SSEManager();
    }
    return SSEManager.instance;
  }

  addClient(controller: ReadableStreamDefaultController): void {
    this.clients.add(controller);
    console.log(`📡 SSE client connected. Total clients: ${this.clients.size}`);
  }

  removeClient(controller: ReadableStreamDefaultController): void {
    this.clients.delete(controller);
    console.log(`📡 SSE client disconnected. Total clients: ${this.clients.size}`);
  }

  notifyAll(data: any): void {
    const message = `data: ${JSON.stringify(data)}\n\n`;
    const encoder = new TextEncoder();
    const encoded = encoder.encode(message);
    
    console.log(`📢 Notifying ${this.clients.size} SSE clients:`, data);
    
    this.clients.forEach(controller => {
      try {
        controller.enqueue(encoded);
      } catch (error) {
        console.error('Failed to send to client, removing:', error);
        this.clients.delete(controller);
      }
    });
  }

  getClientCount(): number {
    return this.clients.size;
  }
}

export default SSEManager;