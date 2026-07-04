import { WebSocketServer, WebSocket } from 'ws';
import * as http from 'http';
import { URL } from 'url';

const PORT = process.env.PORT || 8080;
const SECRET_TOKEN = process.env.BUS_SECRET_TOKEN || '';
const MAX_ROOM_CLIENTS = parseInt(process.env.MAX_ROOM_CLIENTS || '2', 10);
const TRAFFIC_LOG_INTERVAL = parseInt(process.env.TRAFFIC_LOG_INTERVAL || '10000', 10);

// 虚空命名空间：用 Map 维护动态创建的房间拓扑，不向任何数据库持久化状态
const rooms = new Map<string, Set<WebSocket>>();
const wss = new WebSocketServer({ noServer: true });

// 流量监控状态变量
let totalBytesTransferred = 0;
let messageCount = 0;

// 1. 验证 Token (行数限制 30)
function validateToken(url: URL): boolean {
  if (!SECRET_TOKEN) return true;
  const token = url.searchParams.get('token');
  return token === SECRET_TOKEN;
}

// 2. 验证单房间连接上限 (行数限制 30)
function checkConnectionLimit(roomId: string): boolean {
  const clients = rooms.get(roomId);
  if (!clients) return true;
  return clients.size < MAX_ROOM_CLIENTS;
}

// 3. 流量监控上报周期调度 (行数限制 30)
setInterval(() => {
  if (totalBytesTransferred > 0 || messageCount > 0) {
    const kb = (totalBytesTransferred / 1024).toFixed(2);
    console.log(`[TRAFFIC_MONITOR] Last interval bytes: ${kb} KB | Packets count: ${messageCount}`);
    totalBytesTransferred = 0;
    messageCount = 0;
  }
}, TRAFFIC_LOG_INTERVAL);

// 4. 路由拆分与升级请求处理 (行数限制 30)
function handleUpgradeRequest(req: http.IncomingMessage, socket: any, head: Buffer) {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);
  const pathParts = url.pathname.split('/');

  if (pathParts[1] !== 'room' || !pathParts[2]) {
    socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
    return socket.destroy();
  }

  if (!validateToken(url)) {
    console.log(`[!] Auth failure from remote: ${req.socket.remoteAddress}`);
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    return socket.destroy();
  }

  const roomId = pathParts[2];
  if (!checkConnectionLimit(roomId)) {
    console.log(`[!] Room [${roomId}] has reached connection limit of ${MAX_ROOM_CLIENTS}`);
    socket.write('HTTP/1.1 429 Too Many Connections\r\n\r\n');
    return socket.destroy();
  }

  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit('connection', ws, roomId);
  });
}

// 5. 盲转发核心分发器 (行数限制 30)
function broadcastMessage(ws: WebSocket, clientSet: Set<WebSocket>, message: Buffer) {
  totalBytesTransferred += message.length;
  messageCount++;
  for (const peer of clientSet) {
    if (peer !== ws && peer.readyState === WebSocket.OPEN) {
      peer.send(message, { binary: true });
    }
  }
}

// 主 Web 服务配置
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('AESS M2M Chat Bus - Secure Docker Edition Running.\n');
});

server.on('upgrade', handleUpgradeRequest);

wss.on('connection', (ws: WebSocket, roomId: string) => {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Set());
  }
  const clientSet = rooms.get(roomId)!;
  clientSet.add(ws);

  console.log(`[+] Agent linked to Room: [${roomId}]. Total nodes: ${clientSet.size}`);

  ws.on('message', (message: Buffer, isBinary: boolean) => {
    if (!isBinary) {
      ws.close(1003, "AESS Violation: Pure binary packet required.");
      return;
    }
    broadcastMessage(ws, clientSet, message);
  });

  ws.on('close', () => {
    clientSet.delete(ws);
    console.log(`[-] Agent left Room: [${roomId}]. Remaining nodes: ${clientSet.size}`);
    
    if (clientSet.size === 0) {
      rooms.delete(roomId);
      console.log(`[*] Room [${roomId}] exploded from memory. Storage zeroed.`);
    }
  });

  ws.on('error', (err) => {
    ws.close(1011, "Internal Infrastructure Exception");
  });
});

server.listen(PORT, () => {
  console.log(`=== [AESS DOCKER BUS] Secure Engine listening on port ${PORT} ===`);
});
