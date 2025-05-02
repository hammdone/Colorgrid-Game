import express from 'express';
import { User } from '../models/user.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    console.log('Fetching leaderboard data...');

    const users = await User.find({}, {
      username: 1,
      coins: 1,
      wins: 1,
      losses: 1,
      draws: 1,
      profilePicture: 1,
      _id: 1
    }).sort({ coins: -1 }).limit(20);
    
    const formattedUsers = users.map(user => ({
      _id: user._id,
      username: user.username,
      profilePicture: user.profilePicture || '/default-avatar.png',
      coins: user.coins || 0,
      wins: user.wins || 0,
      losses: user.losses || 0,
      draws: user.draws || 0
    }));
    
    console.log(`Returning ${formattedUsers.length} users for leaderboard`);
    res.json(formattedUsers);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ message: 'Error fetching leaderboard data' });
  }
});

export default router;