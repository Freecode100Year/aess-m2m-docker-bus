import { WebSocketServer, WebSocket } from 'ws';
import * as http from 'http';

const PORT = process.env.PORT || 8080;

// 虚空命名空间：用 Map 维护动态创建的房间拓扑，不向任何数据库持久化状态
const rooms = new Map<string, Set<WebSocket>>();

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('AESS M2M Chat Bus - Docker Edition Running.\n');
});

const wss = new WebSocketServer({ noServer: true });

// 拦截 HTTP 握手升级请求，提取 Room ID
server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url || '/', `http://${request.headers.host}`);
  const pathParts = url.pathname.split('/');
  
  // 路径路由规范：/room/:roomId
  if (pathParts[1] !== 'room' || !pathParts[2]) {
    socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
    socket.destroy();
    return;
  }

  const roomId = pathParts[2];

  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, roomId);
  });
});

wss.on('connection', (ws: WebSocket, roomId: string) => {
  // 动态唤醒/创建房间
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Set());
  }
  const clientSet = rooms.get(roomId)!;
  clientSet.add(ws);

  console.log(`[+] Agent linked to Room: [${roomId}]. Total nodes: ${clientSet.size}`);

  ws.on('message', (message: Buffer, isBinary: boolean) => {
    // AESS 规范红线：必须是纯二进制 ArrayBuffer/Buffer 流，坚决驱逐人类自然语言文本
    if (!isBinary) {
      ws.close(1003, "AESS Violation: Pure binary packet required.");
      return;
    }

    // 物理层盲转发（Blind Reflection）逻辑：
    // 遍历当前房间所有活跃的 Socket 节点，将收到的原始字节流盲发给除自己以外的所有机器
    for (const peer of clientSet) {
      if (peer !== ws && peer.readyState === WebSocket.OPEN) {
        peer.send(message, { binary: true });
      }
    }
  });

  ws.on('close', () => {
    clientSet.delete(ws);
    console.log(`[-] Agent left Room: [${roomId}]. Remaining nodes: ${clientSet.size}`);
    
    // 零内存残留：房间如果空了，立刻从内存中彻底抹除，绝不留存持久化数据
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
  console.log(`=== [AESS DOCKER BUS] Engine listening on port ${PORT} ===`);
});
