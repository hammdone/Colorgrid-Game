// routes/games.js
import express from 'express';
import { Game } from '../models/game.js';
import { User } from '../models/user.js';
import mongoose from 'mongoose';

const router = express.Router();

// Get history of games for a specific user
router.get('/history/:username', async (req, res) => {
  try {
    const { username } = req.params;
    
    // Find games where the user is either player1 or player2
    const games = await Game.find({
      $or: [
        { player1_username: username },
        { player2_username: username }
      ]
    }).sort({ createdAt: -1 });
    
    // Format games for response
    const formattedGames = await Promise.all(games.map(async (game) => {
      // Determine if the user is player1 or player2
      const isPlayer1 = game.player1_username === username;
      
      // Get opponent info
      const opponentUsername = isPlayer1 ? game.player2_username : game.player1_username;
      
      // Find opponent's profile picture
      const opponent = await User.findOne({ username: opponentUsername }, { profilePicture: 1 });
      
      return {
        _id: game._id,
        opponent: opponentUsername,
        opponentProfilePicture: opponent?.profilePicture || null,
        winner: game.winner_username,
        result: game.result,
        createdAt: game.createdAt
      };
    }));
    
    res.json(formattedGames);
  } catch (error) {
    console.error('Error fetching game history:', error);
    res.status(500).json({ message: 'Error fetching game history' });
  }
});

// Get a specific game by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid game ID format' });
    }
    
    const game = await Game.findById(id);
    
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }
    
    // Get player profile pictures
    const player1 = await User.findOne({ username: game.player1_username }, { profilePicture: 1 });
    const player2 = await User.findOne({ username: game.player2_username }, { profilePicture: 1 });
    
    // Format response
    const response = {
      _id: game._id,
      players: [
        { 
          username: game.player1_username, 
          color: game.player1_color,
          profilePicture: player1?.profilePicture || '/default-avatar.png'
        },
        { 
          username: game.player2_username, 
          color: game.player2_color,
          profilePicture: player2?.profilePicture || '/default-avatar.png'
        }
      ],
      // Prioritize grid over final_grid as the DB shows grid contains the final state
      grid: game.grid || game.final_grid,
      winner: game.winner_username,
      result: game.result,
      createdAt: game.createdAt,
      opponent: game.player1_username === req.query.username ? game.player2_username : game.player1_username
    };
    
    console.log(`Returning game data for game ${id}:`, {
      id: response._id,
      gridSize: response.grid ? `${response.grid.length}x${response.grid[0]?.length || 0}` : 'No grid',
      winner: response.winner
    });
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching game details:', error);
    res.status(500).json({ message: 'Error fetching game details' });
  }
});

router.get('/', async (req, res) => {
  try {
    const games = await Game.find({ 
      status: 'finished'
    }).select('player1_username player2_username winner_username result status');
    
    res.json(games);
  } catch (error) {
    console.error('Error fetching all games:', error);
    res.status(500).json({ message: 'Error fetching game data' });
  }
});

export default router;