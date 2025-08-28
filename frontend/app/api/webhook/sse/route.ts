import { NextRequest } from 'next/server';
import SSEManager from '../sse-manager';

const sseManager = SSEManager.getInstance();

// Export function to notify all clients
export function notifyClients(data: any) {
  sseManager.notifyAll(data);
}

export async function GET(request: NextRequest) {
  const responseStream = new ReadableStream({
    start(controller) {
      // Add client to manager
      sseManager.addClient(controller);
      
      // Send initial connection message
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode('data: {"type":"connected"}\n\n'));
      
      // Send heartbeat every 30 seconds to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          const heartbeatMsg = encoder.encode('data: {"type":"heartbeat"}\n\n');
          controller.enqueue(heartbeatMsg);
        } catch (error) {
          clearInterval(heartbeat);
          sseManager.removeClient(controller);
        }
      }, 30000);
      
      // Clean up on disconnect
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        sseManager.removeClient(controller);
        controller.close();
      });
    },
  });

  return new Response(responseStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  });
}