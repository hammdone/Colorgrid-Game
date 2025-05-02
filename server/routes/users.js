// routes/users.js
import express from 'express';
import { User } from '../models/user.js';

const router = express.Router();

// Get user by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find user by ID
    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Prepare response without password
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

// Update user profile
router.put('/profile', async (req, res) => {
  try {
    const { username, newUsername, password, profilePicture } = req.body;
    
    // Find user by current username
    const user = await User.findOne({ username });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if new username is provided and different from current username
    if (newUsername && newUsername !== username) {
      // Check if new username is already taken
      const existingUser = await User.findOne({ username: newUsername });
      if (existingUser) {
        return res.status(400).json({ message: 'Username already taken' });
      }
      
      // Update username
      user.username = newUsername;
    }
    
    // Update fields if provided
    if (password) {
      user.password = password; // In a real app, you would hash this password
    }
    
    if (profilePicture !== undefined) {
      user.profilePicture = profilePicture;
    }
    
    // Save updated user
    await user.save();
    
    // Prepare response without password
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