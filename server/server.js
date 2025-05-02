// Import necessary modules
import { Server } from "socket.io";
import http from "http";
import { app } from "./app.js";
import { config } from "dotenv";
import mongoose from "mongoose";
import authRouter from "./routes/auth.js";
import leaderboardRouter from "./routes/leaderboard.js";
import gamesRouter from "./routes/games.js";
import usersRouter from "./routes/users.js";
import { WaitingPlayer } from './models/waitingPlayer.js';

import GameController from "./controllers/gameController.js";

// Handle MongoDB connection errors
mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.once('open', () => {
  console.log('Connected to MongoDB successfully');
});

// Load environment variables
config({
  path: "./config.env",
});

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:5174'],  // Add both common Vite ports
    methods: ['GET', 'POST'],
    credentials: true
  },
  connectionStateRecovery: {
    maxDisconnectionDuration: 30000 // Increased timeout for reconnection
  },
  pingTimeout: 30000, // Increase ping timeout
  pingInterval: 10000 // More frequent ping checks
});

console.log('Socket.io server initialized with enhanced connection settings');

// Socket authentication middleware (simplified)
io.use((socket, next) => {
  const username = socket.handshake.auth.username;
  console.log('\n[SOCKET AUTH] Incoming connection');
  console.log('  > Socket ID:', socket.id);
  console.log('  > Username:', username);
  
  // Accept connection even without username for testing
  if (!username) {
    console.warn('  > ⚠️ No username provided. Accepting socket for debugging.');
    return next();
  }
  
  console.log('  > ✅ Authentication valid');
  next();
});

// --- ColorGrid Matchmaking and Game Logic ---
import { User } from './models/user.js';

// Initialize game controller
const gameController = new GameController(io);

// Primary socket connection handler
io.on('connection', (socket) => {
  console.log('\n🟢 NEW SOCKET CONNECTION');
  console.log('  ID:', socket.id);
  console.log('  User:', socket.handshake.auth.username || 'guest');
  console.log('  Headers:', {
    'user-agent': socket.handshake.headers['user-agent']?.substring(0, 50) + '...',
    'origin': socket.handshake.headers.origin
  });
  
  // Pass socket to game controller for game-specific logic
  gameController.handleConnection(socket);
});

// --- Debug endpoints ---
app.get('/debug/socket-connections', (req, res) => {
  const sockets = Array.from(io.sockets.sockets.values());
  
  // Group sockets by username
  const socketsByUsername = {};
  
  sockets.forEach(s => {
    const username = s.handshake.auth.username || 'anonymous';
    if (!socketsByUsername[username]) {
      socketsByUsername[username] = [];
    }
    socketsByUsername[username].push({
      id: s.id,
      connected: s.connected,
      rooms: Array.from(s.rooms),
    });
  });
  
  res.json({
    totalConnections: sockets.length,
    socketsByUsername,
  });
});

app.get('/debug/waiting-players', (req, res) => {
  const waitingPlayers = Array.from(gameController.waitingPlayers.entries()).map(([username, socket]) => ({
    username,
    socketId: socket?.id || 'disconnected',
    connected: socket?.connected || false
  }));
  
  res.json({
    count: gameController.waitingPlayers.size,
    players: waitingPlayers,
    matchingInProgress: gameController._matchingInProgress
  });
});

app.get('/debug/active-games', (req, res) => {
  const games = Array.from(gameController.activeGames.entries()).map(([id, gameData]) => ({
    gameId: id,
    players: Array.from(gameData.players.keys()),
    playerSockets: Array.from(gameData.players.entries()).map(([name, socket]) => ({
      name,
      socketId: socket?.id || 'disconnected',
      connected: socket?.connected || false
    })),
    status: gameData.game.status,
    turn: gameData.game.currentTurn
  }));
  
  res.json({
    count: gameController.activeGames.size,
    games
  });
});

app.get('/debug/force-match', async (req, res) => {
  try {
    // Force matchmaking
    await gameController.matchPlayers();
    res.json({
      success: true,
      message: "Matchmaking forced",
      waitingCount: gameController.waitingPlayers.size,
      waitingPlayers: Array.from(gameController.waitingPlayers.keys()),
      activeGames: gameController.activeGames.size
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// --- API routes ---
app.use('/api/auth', authRouter);
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/games', gamesRouter);
app.use('/api/users', usersRouter);

// Game-related API routes
app.get('/api/waiting-status', async (req, res) => {
  try {
    const waitingPlayers = await WaitingPlayer.find().sort({ joinedAt: -1 });
    res.json({
      count: waitingPlayers.length,
      players: waitingPlayers.map(p => p.username),
      inMemoryCount: gameController.waitingPlayers.size,
      activeGames: gameController.activeGames.size
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Server startup logic
async function startServer(port = 3000) {
  return new Promise((resolve) => {
    const server = httpServer.listen(port, () => {
      console.log(`Server is running on port ${port}`);
      resolve(server);
    }).on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`Port ${port} in use, trying ${port + 1}`);
        startServer(port + 1).then(resolve);
      } else {
        console.error('Server error:', err);
        process.exit(1);
      }
    });
  });
}

// Connect to MongoDB
async function connectToDatabase() {
  try {
    const { MONGODB_URI } = process.env;
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI not found in environment variables');
    }
    
    await mongoose.connect(MONGODB_URI);
    console.log('Successfully connected to MongoDB');
  } catch (err) {
    console.error('Failed to connect to MongoDB:', err);
    process.exit(1);
  }
}

connectToDatabase();

// Start the server
async function main() {
  try {
    const server = await startServer();
    
    process.on('SIGINT', () => {
      console.log('\nShutting down server...');
      server?.close(() => process.exit(0));
    });
  } catch (err) {
    console.error('Failed to start server:', err);
  }
}

main();