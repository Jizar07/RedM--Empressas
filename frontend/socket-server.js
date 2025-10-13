const { Server } = require('socket.io');
const { createServer } = require('http');

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:3051",
    methods: ["GET", "POST"]
  }
});

// Store for server data and current server selection
let serverData = {
  info: null,
  players: [],
  dynamic: null,
  lastUpdate: null
};

// Current selected server (shared across all clients for simplicity)
let currentServer = {
  ip: '131.196.197.140',
  port: '30120',
  name: 'Atlanta Server'
};

// Fetch server data from RedM with dynamic server selection
async function fetchRedMData(serverIp = currentServer.ip, serverPort = currentServer.port) {
  try {
    console.log(`📡 Fetching data from ${serverIp}:${serverPort}...`);

    const [infoRes, playersRes, dynamicRes] = await Promise.all([
      fetch(`http://${serverIp}:${serverPort}/info.json`, {
        signal: AbortSignal.timeout(5000)
      }).catch(() => null),
      fetch(`http://${serverIp}:${serverPort}/players.json`, {
        signal: AbortSignal.timeout(5000)
      }).catch(() => null),
      fetch(`http://${serverIp}:${serverPort}/dynamic.json`, {
        signal: AbortSignal.timeout(5000)
      }).catch(() => null)
    ]);

    if (infoRes && infoRes.ok) {
      serverData.info = await infoRes.json();
    } else {
      serverData.info = null;
    }

    if (playersRes && playersRes.ok) {
      serverData.players = await playersRes.json();
    } else {
      serverData.players = [];
    }

    if (dynamicRes && dynamicRes.ok) {
      serverData.dynamic = await dynamicRes.json();
    } else {
      serverData.dynamic = null;
    }

    serverData.lastUpdate = new Date().toISOString();

    const playerCount = serverData.players?.length || 0;
    console.log(`✅ Data fetched: ${playerCount} players online`);

    return serverData;
  } catch (error) {
    console.error('❌ Error fetching RedM data:', error.message);
    serverData.info = null;
    serverData.players = [];
    serverData.dynamic = null;
    serverData.lastUpdate = new Date().toISOString();
    return serverData;
  }
}

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`✅ Client connected: ${socket.id} (Total: ${io.sockets.sockets.size})`);

  // Send initial data immediately
  socket.emit('serverData', serverData);
  console.log(`📤 Sent initial data to ${socket.id}`);

  // Handle server selection
  socket.on('selectServer', (serverInfo) => {
    console.log(`🔄 Client ${socket.id} selected server: ${serverInfo.name} (${serverInfo.ip}:${serverInfo.port})`);

    // Update current server for all clients
    currentServer = {
      ip: serverInfo.ip,
      port: serverInfo.port,
      name: serverInfo.name || 'RedM Server'
    };

    // Immediately fetch new server data
    fetchRedMData(currentServer.ip, currentServer.port).then(data => {
      io.emit('serverData', data);
      console.log(`📤 Broadcasted new server data to all ${io.sockets.sockets.size} clients`);
    });
  });

  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id} (Remaining: ${io.sockets.sockets.size})`);
  });
});

// Fetch data every 10 seconds and emit to all clients (faster updates for real-time feel)
const UPDATE_INTERVAL = 10000; // 10 seconds
setInterval(async () => {
  const data = await fetchRedMData(currentServer.ip, currentServer.port);
  io.emit('serverData', data);
  console.log(`📤 Broadcasting to ${io.sockets.sockets.size} clients`);
}, UPDATE_INTERVAL);

// Initial fetch
fetchRedMData(currentServer.ip, currentServer.port).then(data => {
  console.log('🚀 Socket.IO server initialized');
  console.log(`📊 Current server: ${currentServer.name} (${currentServer.ip}:${currentServer.port})`);
  console.log(`👥 Players online: ${data.players?.length || 0}`);
});

const SOCKET_PORT = 3052;
httpServer.listen(SOCKET_PORT, () => {
  console.log(`✅ Socket.IO server running on http://localhost:${SOCKET_PORT}`);
  console.log(`🔄 Update interval: ${UPDATE_INTERVAL / 1000}s`);
});