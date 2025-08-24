const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3051;

console.log('Starting server in', dev ? 'development' : 'production', 'mode');

const app = next({ dev });
const handle = app.getRequestHandler();

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

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Initialize Socket.io
  const io = new Server(server, {
    cors: {
      origin: "http://localhost:3051",
      methods: ["GET", "POST"]
    }
  });

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
  }, 30000);

  // Initial fetch
  fetchRedMData().then(data => {
    console.log('Initial server data fetched');
  });

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log('> Socket.io server running');
  });
});