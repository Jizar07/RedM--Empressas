const { Server } = require('socket.io');
const { createServer } = require('http');

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:3051",
    methods: ["GET", "POST"]
  }
});

// Store for server data
let serverData = {
  info: null,
  players: [],
  dynamic: null,
  lastUpdate: null
};

// Fetch server data from RedM
async function fetchRedMData() {
  const SERVER_IP = '131.196.197.140';
  const SERVER_PORT = '30120';
  
  try {
    const [infoRes, playersRes, dynamicRes] = await Promise.all([
      fetch(`http://${SERVER_IP}:${SERVER_PORT}/info.json`).catch(() => null),
      fetch(`http://${SERVER_IP}:${SERVER_PORT}/players.json`).catch(() => null),
      fetch(`http://${SERVER_IP}:${SERVER_PORT}/dynamic.json`).catch(() => null)
    ]);

    if (infoRes && infoRes.ok) {
      serverData.info = await infoRes.json();
    }

    if (playersRes && playersRes.ok) {
      serverData.players = await playersRes.json();
    }

    if (dynamicRes && dynamicRes.ok) {
      serverData.dynamic = await dynamicRes.json();
    }

    serverData.lastUpdate = new Date().toISOString();
    return serverData;
  } catch (error) {
    console.error('Error fetching RedM data:', error);
    return serverData;
  }
}

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Send initial data
  socket.emit('serverData', serverData);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Fetch data every 30 seconds and emit to all clients
setInterval(async () => {
  console.log('Fetching RedM server data...');
  const data = await fetchRedMData();
  io.emit('serverData', data);
  console.log(`Emitting update to ${io.sockets.sockets.size} clients`);
}, 30000);

// Initial fetch
fetchRedMData().then(data => {
  console.log('Initial server data fetched');
  console.log(`Players online: ${data.players?.length || 0}`);
});

const SOCKET_PORT = 3052;
httpServer.listen(SOCKET_PORT, () => {
  console.log(`Socket.io server running on http://localhost:${SOCKET_PORT}`);
});