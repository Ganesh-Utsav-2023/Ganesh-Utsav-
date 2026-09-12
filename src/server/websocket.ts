import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'node:http';

let wss: WebSocketServer | null = null;

export function initWebSocket(server: Server) {
  wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    try {
      const url = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`);
      if (url.pathname === '/ws') {
        wss?.handleUpgrade(request, socket, head, (ws) => {
          wss?.emit('connection', ws, request);
        });
      }
    } catch (e) {
      console.error('Error handling WebSocket upgrade:', e);
    }
  });

  wss.on('connection', (ws) => {
    // Send welcome connection confirmation
    ws.send(JSON.stringify({ type: 'CONNECTED', message: 'Connected to Ganesh Aarti real-time feed' }));

    ws.on('error', (error) => {
      console.error('WebSocket client error:', error);
    });
  });

  console.log('WebSocket server initialized on path /ws');
  return wss;
}

export function broadcastEvent(type: string, data: any) {
  if (!wss) return;

  const payload = JSON.stringify({ type, data, timestamp: new Date().toISOString() });
  
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(payload);
      } catch (err) {
        console.error('Failed to send WebSocket message to client:', err);
      }
    }
  }
}
