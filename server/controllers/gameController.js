import { Game } from '../models/game.js';
import { User } from '../models/user.js';
import { WaitingPlayer } from '../models/waitingPlayer.js';
import { maxAreaOfIsland } from '../utils/maxAreaOfIsland.js';

class GameController {
  constructor(io) {
    this.io = io;
    this.waitingPlayers = new Map(); // username -> socket
    this.activeGames = new Map(); // gameId -> { game, players: Map(username -> socket) }
    this._matchingInProgress = false;
    
    // Load waiting players from DB on startup
    this.loadWaitingPlayers();
    
    // Set up heartbeat interval
    setInterval(() => this.checkPlayerConnections(), 10000); // Every 10 seconds
  }

  async loadWaitingPlayers() {
    try {
      const players = await WaitingPlayer.find();
      players.forEach(player => {
        // Note: Sockets will need to reconnect
        this.waitingPlayers.set(player.username, null); 
      });
      console.log(`Loaded ${players.length} waiting players from DB`);
    } catch (err) {
      console.error('Error loading waiting players:', err);
    }
  }

  async addToWaiting(username, socket) {
    console.log(`[DB] Adding ${username} to waiting players`);
    try {
      // Check if player already exists in DB
      const existingPlayer = await WaitingPlayer.findOne({ username });
      if (existingPlayer) {
        // Update socket ID
        await WaitingPlayer.updateOne(
          { username }, 
          { $set: { socketId: socket.id, updatedAt: new Date() } }
        );
        console.log(`Updated socket ID for existing player ${username}`);
      } else {
        // Create new waiting player
        await WaitingPlayer.create({
          username,
          socketId: socket.id
        });
        console.log(`Created new waiting player ${username}`);
      }
      
      // Update in-memory map
      this.waitingPlayers.set(username, socket);
      
      console.log(`Current waiting players (${this.waitingPlayers.size}):`, 
        Array.from(this.waitingPlayers.keys()).join(', '));
      
      return true;
    } catch (err) {
      console.error(`Error adding ${username} to waiting players DB:`, err);
      // Still add to in-memory map even if DB operation fails
      this.waitingPlayers.set(username, socket);
      return false;
    }
  }

  async removeFromWaiting(username) {
    try {
      await WaitingPlayer.deleteOne({ username });
      this.waitingPlayers.delete(username);
      console.log(`Removed ${username} from waiting players`);
      return true;
    } catch (err) {
      console.error(`Error removing ${username} from waiting players DB:`, err);
      // Still remove from in-memory map even if DB operation fails
      this.waitingPlayers.delete(username);
      return false;
    }
  }

  async checkPlayerConnections() {
    console.log('Checking player connections...');
    const disconnectedPlayers = [];
    
    // Check waiting players
    for (const [username, socket] of this.waitingPlayers.entries()) {
      if (!socket || !socket.connected) {
        disconnectedPlayers.push(username);
      }
    }
    
    // Remove disconnected players
    for (const username of disconnectedPlayers) {
      console.log(`Removing disconnected player from waiting: ${username}`);
      await this.removeFromWaiting(username);
    }
    
    console.log(`Removed ${disconnectedPlayers.length} disconnected players`);
    console.log(`Remaining waiting players: ${this.waitingPlayers.size}`);
    
    // If we still have enough players after cleanup, try to match
    if (this.waitingPlayers.size >= 2 && !this._matchingInProgress) {
      console.log('Attempting to match players after cleanup...');
      this.matchPlayers();
    }
  }
  
  async matchPlayers() {
    // Prevent concurrent matching
    if (this._matchingInProgress) {
      console.log('Matchmaking already in progress, skipping...');
      return;
    }
    
    this._matchingInProgress = true;
    console.log('Starting matchmaking process...');
    
    try {
      console.log(`Current waiting players: ${this.waitingPlayers.size}`);
      
      // We need at least 2 players to match
      if (this.waitingPlayers.size < 2) {
        console.log('Not enough players to match');
        this._matchingInProgress = false;
        return;
      }
      
      // Get players with connected sockets
      const validPlayers = Array.from(this.waitingPlayers.entries())
        .filter(([_, socket]) => socket && socket.connected);
      
      console.log(`Valid players for matching: ${validPlayers.length}`);
      
      // Need at least 2 valid players
      if (validPlayers.length < 2) {
        console.log('Not enough connected players for matching');
        this._matchingInProgress = false;
        return;
      }
      
      // Take the first two players for matching
      const [player1, player1Socket] = validPlayers[0];
      const [player2, player2Socket] = validPlayers[1];
      
      console.log(`🎮 Matching players: ${player1} vs ${player2}`);
      
      try {
        // Create a new game
        const game = await this.createGame(player1, player2);
        console.log(`📋 Game created with ID: ${game._id}`);
        
        // Start the game
        this.startGame(game, player1Socket, player2Socket);
        console.log(`🎮 Game started: ${game._id}`);
        
        // Remove players from waiting queue
        await this.removeFromWaiting(player1);
        await this.removeFromWaiting(player2);
        
        console.log(`✅ Successfully matched ${player1} and ${player2}`);
      } catch (err) {
        console.error('❌ Error creating game:', err);
        // Send error to clients
        if (player1Socket && player1Socket.connected) {
          player1Socket.emit('matchmaking_error', {
            message: 'Failed to create game, please try again'
          });
        }
        if (player2Socket && player2Socket.connected) {
          player2Socket.emit('matchmaking_error', {
            message: 'Failed to create game, please try again'
          });
        }
      }
    } catch (err) {
      console.error('Error during matchmaking:', err);
    } finally {
      this._matchingInProgress = false;
    }
  }

  handleConnection(socket) {
    console.log('\n=== SOCKET HANDLER ===');
    console.log('  Socket ID:', socket.id);
    console.log('  Connected at:', new Date().toISOString());
    
    // Log all incoming events
    socket.onAny((event, ...args) => {
      console.log(`\n📢 INCOMING EVENT: ${event}`);
      console.log('  From:', socket.id);
      console.log('  Args:', JSON.stringify(args, null, 2));
      console.log('  Timestamp:', new Date().toISOString());
    });
    
    console.log(`[Socket] New connection ID: ${socket.id}`);
    
    // Add a debounce mechanism to prevent multiple rapid events
    const eventTimestamps = {};
    const debounceTime = 2000; // 2 seconds
    
    const debounceEvent = (eventName, handler) => {
      socket.on(eventName, (...args) => {
        const now = Date.now();
        const lastTime = eventTimestamps[eventName] || 0;
        
        if (now - lastTime > debounceTime) {
          eventTimestamps[eventName] = now;
          handler(...args);
        } else {
          console.log(`Debounced ${eventName} event (too frequent)`);
        }
      });
    };
    
    // Handle find_match with debounce
    debounceEvent('find_match', async (data) => {
      // Handle both string and object formats
      const username = typeof data === 'object' ? data.username : data;
      
      console.log(`[Socket] Find match from ${username}`);
      try {
        await this.handleJoinGame(socket, username);
        console.log(`[Socket] ${username} added to queue`);
        
        // Acknowledge the request
        socket.emit('matchmaking_status', { 
          status: 'queued',
          username: username,
          queueSize: this.waitingPlayers.size
        });

        // Try to match players right away if possible
        if (this.waitingPlayers.size >= 2 && !this._matchingInProgress) {
          console.log('Attempting matchmaking immediately after new player joined');
          this.matchPlayers();
        }
      } catch (err) {
        console.error('[Socket] Find match error:', err);
        socket.emit('error', { message: 'Failed to join matchmaking' });
      }
    });

    // Handle joinGame with debounce
    debounceEvent('joinGame', async (data) => {
      // Handle both formats: string or object
      const username = typeof data === 'object' ? data.username : data;
      const gameId = typeof data === 'object' ? data.gameId : null;
      
      console.log(`[Socket] JoinGame from ${username} (socket ${socket.id}) ${gameId ? `for game ${gameId}` : ''}`);
      
      try {
        if (gameId) {
          // Join specific game
          await this.handleJoinExistingGame(socket, username, gameId);
        } else {
          // Join matchmaking
          await this.handleJoinGame(socket, username);
          
          // Try to match players right away if possible
          if (this.waitingPlayers.size >= 2 && !this._matchingInProgress) {
            console.log('Attempting matchmaking immediately after new player joined');
            this.matchPlayers();
          }
        }
        console.log(`[Socket] ${username} added to queue or game`);
      } catch (err) {
        console.error('[Socket] JoinGame error:', err);
        socket.emit('error', { message: 'Failed to join game' });
      }
    });

    // Handle makeMove with debounce
    debounceEvent('makeMove', async (data) => {
      console.log(`[Socket] Make move request from ${data.player || data.username} (socket ${socket.id})`);
      try {
        // Use player field or username field
        const moveData = {
          gameId: data.gameId,
          row: data.row,
          col: data.col,
          username: data.player || data.username
        };
        await this.handleMove(socket, moveData);
      } catch (err) {
        console.error('[Socket] Make move error:', err);
      }
    });

    // Handle all cancel events using the same handler with debounce
    const cancelHandler = async (data) => {
      // Handle both string and object format
      const username = typeof data === 'object' ? data.username : data;
      
      console.log(`[Socket] Canceling matchmaking for ${username}`);
      try {
        await this.removeFromWaiting(username);
        socket.emit('matchmaking_status', { 
          status: 'canceled',
          username: username
        });
      } catch (err) {
        console.error('[Socket] Cancel matchmaking error:', err);
      }
    };
    
    debounceEvent('cancelMatchmaking', cancelHandler);
    debounceEvent('cancelMatch', cancelHandler);
    debounceEvent('leaveQueue', cancelHandler);

    // Handle forfeit with debounce
    debounceEvent('forfeit', async (data) => {
      console.log(`[Socket] Forfeit request from ${data.username} (socket ${socket.id})`);
      try {
        await this.handleForfeit(socket, data);
      } catch (err) {
        console.error('[Socket] Forfeit error:', err);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`[Socket] Disconnected ${socket.id}: ${reason}`);
      this.handleDisconnect(socket);
    });

    socket.on('ping', (data, callback) => {
      if (typeof callback === 'function') {
        callback({
          timestamp: data.timestamp || Date.now(),
          serverId: socket.id,
          username: socket.handshake.auth.username
        });
      }
    });
    
    // Handle saving game snapshots for history
    socket.on('saveGameSnapshot', async (data) => {
      try {
        console.log(`[Socket] Saving game snapshot for game ${data.gameId}`);
        
        // Find the game in the database
        const gameDoc = await Game.findById(data.gameId);
        if (gameDoc) {
          // Update the game with final state
          gameDoc.grid = data.grid;
          gameDoc.status = data.status || 'finished';
          gameDoc.winner_username = data.winner;
          
          // Save the snapshot
          await gameDoc.save();
          console.log(`Game snapshot saved for ${data.gameId}`);
          
          // Notify the client
          socket.emit('snapshotSaved', { success: true, gameId: data.gameId });
        } else {
          console.error(`Game ${data.gameId} not found for snapshot`);
          socket.emit('snapshotSaved', { success: false, error: 'Game not found' });
        }
      } catch (err) {
        console.error('Error saving game snapshot:', err);
        socket.emit('snapshotSaved', { success: false, error: err.message });
      }
    });

    // Error handlers
    socket.on('error', (err) => {
      console.error(`[Socket] Error on ${socket.id}:`, err);
    });
  }

  async handleJoinExistingGame(socket, username, gameId) {
    // Check if game exists in active games
    if (this.activeGames.has(gameId)) {
      const gameData = this.activeGames.get(gameId);
      
      // Add player socket to game
      gameData.players.set(username, socket);
      
      // Join socket to game room
      socket.join(`game:${gameId}`);
      
      // Find opponent username
      const opponentUsername = gameData.game.players.find(p => p.username !== username)?.username;
      
      // Get opponent profile picture if available
      let opponentProfilePicture = '/default-avatar.png';
      try {
        if (opponentUsername) {
          const opponentUser = await User.findOne({ username: opponentUsername });
          if (opponentUser && opponentUser.profilePicture) {
            opponentProfilePicture = opponentUser.profilePicture;
          }
        }
      } catch (err) {
        console.error(`Error fetching opponent profile picture:`, err);
      }
      
      // Send current game state
      socket.emit('gameState', {
        gameId: gameId,
        grid: gameData.game.grid,
        currentTurn: gameData.game.currentTurn,
        status: gameData.game.status,
        // Find player info
        playerColor: gameData.game.players.find(p => p.username === username)?.color,
        // Find opponent info
        opponent: opponentUsername,
        opponentColor: gameData.game.players.find(p => p.username !== username)?.color,
        opponentProfilePicture: opponentProfilePicture
      });
      
      console.log(`Player ${username} joined existing game ${gameId}`);
    } else {
      // Try to load game from database
      try {
        const game = await Game.findById(gameId);
        if (game) {
          // Initialize game state
          const gameState = {
            _id: game._id,
            players: [
              { username: game.player1_username, color: game.player1_color },
              { username: game.player2_username, color: game.player2_color }
            ],
            grid: game.grid || Array(5).fill().map(() => Array(5).fill(null)),
            currentTurn: game.currentTurn || game.player1_username,
            status: game.status || 'playing'
          };
          
          // Create a new active game
          const gameRoom = new Map([[username, socket]]);
          this.activeGames.set(gameId, { game: gameState, players: gameRoom });
          
          // Join socket to game room
          socket.join(`game:${gameId}`);
          
          // Send game state
          socket.emit('gameState', {
            gameId: gameId,
            grid: gameState.grid,
            currentTurn: gameState.currentTurn,
            status: gameState.status,
            // Find player info
            playerColor: gameState.players.find(p => p.username === username)?.color,
            // Find opponent info
            opponent: gameState.players.find(p => p.username !== username)?.username,
            opponentColor: gameState.players.find(p => p.username !== username)?.color
          });
          
          console.log(`Player ${username} joined game ${gameId} from database`);
        } else {
          throw new Error(`Game ${gameId} not found`);
        }
      } catch (err) {
        console.error(`Error joining game ${gameId}:`, err);
        throw err;
      }
    }
  }

  async handleJoinGame(socket, username) {
    console.log(`Handling join game for ${username}`);
    
    // Store the socket in the waiting players map
    await this.addToWaiting(username, socket);
    console.log(`${username} added to queue (size: ${this.waitingPlayers.size})`);
    
    // Check if we have enough players for matchmaking
    if (this.waitingPlayers.size >= 2) {
      // Don't await this, let it run asynchronously
      this.matchPlayers();
    }
  }

  async handleMove(socket, { gameId, row, col, username }) {
    const gameData = this.activeGames.get(gameId);
    if (!gameData || gameData.game.currentTurn !== username) {
      console.log('Invalid move or not player turn');
      return;
    }

    // Update grid
    const newGrid = JSON.parse(JSON.stringify(gameData.game.grid)); // Deep copy
    
    // Find player color
    const playerColor = gameData.game.players.find(p => p.username === username)?.color;
    if (!playerColor) {
      console.log('Player color not found');
      return;
    }
    
    // Check if cell is empty
    if (newGrid[row][col] !== null && newGrid[row][col] !== 0) {
      console.log('Cell already occupied');
      return;
    }
    
    // Update the cell
    newGrid[row][col] = playerColor;
    gameData.game.grid = newGrid;
    
    // Check if grid is full
    const isGridFull = newGrid.every(row => row.every(cell => cell !== null && cell !== 0));
    
    if (isGridFull) {
      // Determine winner
      const player1 = gameData.game.players[0];
      const player2 = gameData.game.players[1];
      
      // Create grids for each player's color
      const player1Grid = newGrid.map(row => 
        row.map(cell => cell === player1.color ? 1 : 0)
      );
      const player2Grid = newGrid.map(row => 
        row.map(cell => cell === player2.color ? 1 : 0)
      );
      
      // Calculate max areas
      const player1Area = maxAreaOfIsland(player1Grid);
      const player2Area = maxAreaOfIsland(player2Grid);
      
      let winner = null;
      if (player1Area > player2Area) {
        winner = player1.username;
      } else if (player2Area > player1Area) {
        winner = player2.username;
      }
      
      // Game over
      gameData.game.status = 'finished';
      gameData.game.winner = winner;
      
      // Update database
      try {
        const gameDoc = await Game.findById(gameId);
        if (gameDoc) {
          gameDoc.grid = newGrid;
          gameDoc.status = 'finished';
          gameDoc.winner_username = winner;
          // Fixed result value
          gameDoc.result = winner ? 'win' : 'draw';
          await gameDoc.save();
        }
        
        // Update player coins
        if (winner) {
          await User.updateOne(
            { username: winner }, 
            { $inc: { coins: 200, wins: 1 } }
          );
          
          const loser = winner === player1.username ? player2.username : player1.username;
          await User.updateOne(
            { username: loser }, 
            { $inc: { coins: -200, losses: 1 } }
          );
        } else {
          // Draw
          await User.updateOne(
            { username: player1.username }, 
            { $inc: { draws: 1 } }
          );
          await User.updateOne(
            { username: player2.username }, 
            { $inc: { draws: 1 } }
          );
        }
      } catch (err) {
        console.error('Error updating game in database:', err);
      }
      
      // Notify players
      this.io.to(`game:${gameId}`).emit('gameOver', { 
        winner,
        grid: newGrid,
        player1Area,
        player2Area,
        status: 'completed'
      });
      
      // Cleanup
      this.activeGames.delete(gameId);
    } else {
      // Continue game - switch turn
      const opponent = gameData.game.players.find(p => p.username !== username)?.username;
      gameData.game.currentTurn = opponent;
      
      // Update database
      try {
        const gameDoc = await Game.findById(gameId);
        if (gameDoc) {
          gameDoc.grid = newGrid;
          gameDoc.currentTurn = opponent;
          await gameDoc.save();
        }
      } catch (err) {
        console.error('Error updating game in database:', err);
      }
      
      // Notify players
      this.io.to(`game:${gameId}`).emit('moveMade', { 
        grid: newGrid, 
        currentTurn: opponent,
        lastMove: { row, col, player: username }
      });
    }
  }

  async handleForfeit(socket, { gameId, username }) {
    const gameData = this.activeGames.get(gameId);
    if (!gameData) {
      console.log(`Game ${gameId} not found for forfeit`);
      return;
    }

    // Find opponent
    const opponent = gameData.game.players.find(p => p.username !== username)?.username;
    if (!opponent) {
      console.log('Opponent not found');
      return;
    }

    // Update game status
    gameData.game.status = 'forfeit';
    gameData.game.winner = opponent;

    // Update database
    try {
      const gameDoc = await Game.findById(gameId);
      if (gameDoc) {
        gameDoc.status = 'forfeit';
        gameDoc.winner_username = opponent;
        // Use a valid result value based on your schema
        gameDoc.result = 'win';
        await gameDoc.save();
      }
      
      // Update player coins
      await User.updateOne(
        { username }, 
        { $inc: { coins: -200, losses: 1 } }
      );
      await User.updateOne(
        { username: opponent }, 
        { $inc: { coins: 200, wins: 1 } }
      );
    } catch (err) {
      console.error('Error updating game in database:', err);
    }

    // Notify players
    this.io.to(`game:${gameId}`).emit('gameOver', { 
      winner: opponent, 
      status: 'forfeit'
    });

    // Cleanup
    this.activeGames.delete(gameId);
  }

  handleDisconnect(socket) {
    // Find username by socket
    let disconnectedUsername = null;
    
    // Check waiting players
    for (const [username, playerSocket] of this.waitingPlayers.entries()) {
      if (playerSocket === socket) {
        disconnectedUsername = username;
        this.removeFromWaiting(username);
        console.log(`Removed ${username} from waiting queue due to disconnect`);
        break;
      }
    }
    
    // Check active games
    if (!disconnectedUsername) {
      for (const [gameId, gameData] of this.activeGames.entries()) {
        for (const [username, playerSocket] of gameData.players.entries()) {
          if (playerSocket === socket) {
            disconnectedUsername = username;
            
            // Find opponent
            const opponent = gameData.game.players.find(p => p.username !== username)?.username;
            const opponentSocket = opponent ? gameData.players.get(opponent) : null;
            
            if (opponentSocket && gameData.game.status === 'playing') {
              // Handle as forfeit
              this.handleForfeit(socket, { gameId, username });
              console.log(`Player ${username} disconnected from game ${gameId}, handling as forfeit`);
            } else {
              // Just remove the game
              this.activeGames.delete(gameId);
              console.log(`Removed game ${gameId} due to player disconnect`);
            }
            break;
          }
        }
        if (disconnectedUsername) break;
      }
    }
  }

  async createGame(player1, player2) {
    try {
      // Get user objects
      const user1 = await User.findOne({ username: player1 });
      const user2 = await User.findOne({ username: player2 });
      
      if (!user1 || !user2) {
        throw new Error(`Users not found: ${player1}, ${player2}`);
      }
      
      // Generate random colors
      const colors = this.getRandomColors();
      
      // Create initial empty grid (5x5)
      const emptyGrid = Array(5).fill().map(() => Array(5).fill(null));
      
      // Create game document with required fields based on your schema
      const game = new Game({
        player1_id: user1._id,
        player2_id: user2._id,
        player1_username: player1,
        player2_username: player2,
        player1_color: colors[0],
        player2_color: colors[1],
        final_grid: emptyGrid,  // Changed from 'grid' to 'final_grid' to match schema
        result: 'win',  // This is just initial value, will be updated when game ends
        currentTurn: player1
      });
      
      const savedGame = await game.save();
      console.log(`Game created with ID: ${savedGame._id}`);
      
      // Build and return game object for use in-memory
      return {
        _id: savedGame._id,
        players: [
          { username: player1, color: colors[0] },
          { username: player2, color: colors[1] }
        ],
        grid: emptyGrid,
        currentTurn: player1,
        status: 'playing'
      };
    } catch (err) {
      console.error('Error creating game:', err);
      throw err;
    }
  }

  startGame(game, player1Socket, player2Socket) {
    const gameId = game._id.toString();
    const player1 = game.players[0].username;
    const player2 = game.players[1].username;
    
    // Create game room
    const gameRoom = new Map([
      [player1, player1Socket],
      [player2, player2Socket]
    ]);
    
    // Store in active games
    this.activeGames.set(gameId, { 
      game, 
      players: gameRoom 
    });

    // Join sockets to game room
    if (player1Socket) player1Socket.join(`game:${gameId}`);
    if (player2Socket) player2Socket.join(`game:${gameId}`);

    // Send the gameStart event with consistent structure to both players
    const gameStartEvent = {
      gameId,
      currentTurn: game.currentTurn
    };
    
    // Notify player 1
    if (player1Socket && player1Socket.connected) {
      player1Socket.emit('gameStart', {
        ...gameStartEvent,
        playerColor: game.players[0].color,
        opponentColor: game.players[1].color,
        opponent: player2
      });
    }
    
    // Notify player 2
    if (player2Socket && player2Socket.connected) {
      player2Socket.emit('gameStart', {
        ...gameStartEvent,
        playerColor: game.players[1].color,
        opponentColor: game.players[0].color,
        opponent: player1
      });
    }
    
    console.log(`Game ${gameId} started with players ${player1} and ${player2}`);
  }

  getRandomColors() {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD', '#D4A5A5'];
    const shuffled = colors.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 2);
  }
}

export default GameController;