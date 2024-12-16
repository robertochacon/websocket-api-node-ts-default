import { WebSocketServer, WebSocket } from 'ws';
import * as fs from 'fs';

// Leer configuración desde el archivo JSON
const config = JSON.parse(fs.readFileSync('./config.json', 'utf-8'));

const PORT = config.port || 8080;
const TOKEN = config.token || 'default-token';

// Mapa para gestionar canales
const channels: Map<string, Set<WebSocket>> = new Map();

// Crear el servidor WebSocket
const wss = new WebSocketServer({ port: PORT });

console.log(`Servidor WebSocket iniciado en ws://localhost:${PORT}`);

// Valida si un token coincide con el configurado
function isValidToken( incomingToken: string ): boolean {
  return incomingToken === TOKEN;
}

// Manejar conexiones de clientes
wss.on('connection', (ws: WebSocket, req) => {
  // Extraer token y canal de la URL
  const url = new URL(req.url || '', `ws://${req.headers.host}`);
  const token = url.searchParams.get('token');
  const channel = url.searchParams.get('channel') || 'default';

  if (!token || !isValidToken(token)) {
    console.log('Conexión rechazada por token inválido');
    ws.close(1008, 'Token inválido');
    return;
  }

  console.log(`Cliente conectado al canal "${channel}"`);

  // Agregar el cliente al canal correspondiente
  if (!channels.has(channel)) {
    channels.set(channel, new Set());
  }
  channels.get(channel)?.add(ws);

  // Enviar mensaje de bienvenida
  ws.send(`¡Bienvenido al canal "${channel}"!`);

  // Escuchar mensajes del cliente
  ws.on('message', (message: string) => {
    console.log(`Mensaje recibido en canal "${channel}":`, message);

    // Difundir el mensaje a los clientes del canal
    const channelClients = channels.get(channel) || new Set();
    channelClients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });

  // Manejar la desconexión del cliente
  ws.on('close', () => {
    console.log(`Cliente desconectado del canal "${channel}"`);
    channels.get(channel)?.delete(ws);

    // Eliminar el canal si no tiene clientes
    if (channels.get(channel)?.size === 0) {
      channels.delete(channel);
    }
  });
});
