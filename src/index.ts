import { WebSocketServer, WebSocket } from 'ws';
import * as fs from 'fs';
import * as http from 'http';
import * as path from 'path';
import { IncomingMessage, ServerResponse } from 'http';

// Leer configuración desde variables de entorno o archivo JSON
let config: { port?: number; token?: string } = {};
try {
  if (fs.existsSync('./config.json')) {
    config = JSON.parse(fs.readFileSync('./config.json', 'utf-8'));
  }
} catch (error) {
  console.log('No se pudo leer config.json, usando variables de entorno');
}

// Render asigna el puerto automáticamente, usar process.env.PORT si está disponible
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : (config.port || 8080);
const TOKEN = process.env.TOKEN || config.token || 'default-token';

// Mapa para gestionar canales
const channels: Map<string, Set<WebSocket>> = new Map();

// Función para encontrar y leer el archivo HTML
function serveIndexHtml(res: ServerResponse): void {
  const possiblePaths = [
    path.join(__dirname, '../public/index.html'), // Desarrollo
    path.join(__dirname, './public/index.html'),  // Producción (después de build)
    path.join(process.cwd(), 'public/index.html') // Fallback
  ];
  
  let fileFound = false;
  for (const filePath of possiblePaths) {
    if (fs.existsSync(filePath)) {
      fs.readFile(filePath, (err: NodeJS.ErrnoException | null, data: Buffer) => {
        if (err) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Error al cargar la página');
          return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(data);
      });
      fileFound = true;
      break;
    }
  }
  
  if (!fileFound) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Página no encontrada');
  }
}

// Crear servidor HTTP
const server = http.createServer((req: IncomingMessage, res: ServerResponse) => {
  // Servir la página de inicio
  if (req.url === '/' || req.url === '/index.html') {
    serveIndexHtml(res);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Página no encontrada');
  }
});

// Crear el servidor WebSocket sobre el servidor HTTP
const wss = new WebSocketServer({ server });

// Iniciar el servidor
server.listen(PORT, () => {
  console.log(`Servidor HTTP iniciado en http://localhost:${PORT}`);
  console.log(`Servidor WebSocket iniciado en ws://localhost:${PORT}`);
});

// Valida si un token coincide con el configurado
function isValidToken( incomingToken: string ): boolean {
  return incomingToken === TOKEN;
}

// Manejar conexiones de clientes
wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
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
  ws.on('message', (message: any) => {
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
