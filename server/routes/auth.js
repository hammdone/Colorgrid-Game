import express from 'express';
import { User } from '../models/user.js';

const router = express.Router();

// Signup route
router.post('/signup', async (req, res) => {
  try {
    const { username, password, profilePicture } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    // Create new user
    const user = await User.create({
      username,
      password, // Simple authentication - no hashing
      profilePicture,
      coins: 1000, // Initial coins
      wins: 0,
      losses: 0,
      draws: 0
    });

    // Remove password from response
    const userResponse = {
      _id: user._id,
      username: user.username,
      profilePicture: user.profilePicture,
      coins: user.coins,
      wins: user.wins,
      losses: user.losses,
      draws: user.draws
    };

    res.status(201).json({ user: userResponse });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Error creating user' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (user.password !== password) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const userResponse = {
      _id: user._id,
      username: user.username,
      profilePicture: user.profilePicture,
      coins: user.coins,
      wins: user.wins,
      losses: user.losses,
      draws: user.draws
    };

    res.json({ user: userResponse });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error during login' });
  }
});

export default router;