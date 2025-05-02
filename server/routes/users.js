import express from 'express';
import { User } from '../models/user.js';

const router = express.Router();


router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const userResponse = {
      _id: user._id,
      username: user.username,
      profilePicture: user.profilePicture,
      coins: user.coins,
      wins: user.wins || 0,
      losses: user.losses || 0,
      draws: user.draws || 0
    };
    
    res.json({ user: userResponse });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Error fetching user data' });
  }
});

router.put('/profile', async (req, res) => {
  try {
    const { username, newUsername, password, profilePicture } = req.body;
    
    const user = await User.findOne({ username });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (newUsername && newUsername !== username) {
      const existingUser = await User.findOne({ username: newUsername });
      if (existingUser) {
        return res.status(400).json({ message: 'Username already taken' });
      }
      
      user.username = newUsername;
    }
    
    if (password) {
      user.password = password; 
    }
    
    if (profilePicture !== undefined) {
      user.profilePicture = profilePicture;
    }
    
    await user.save();
    
    const userResponse = {
      _id: user._id,
      username: user.username,
      profilePicture: user.profilePicture,
      coins: user.coins,
      wins: user.wins || 0,
      losses: user.losses || 0,
      draws: user.draws || 0
    };
    
    res.json({ user: userResponse });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Error updating profile' });
  }
});

export default router;