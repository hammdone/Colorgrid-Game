import mongoose from 'mongoose';

const gameSchema = new mongoose.Schema({
  player1_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  player2_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  player1_username: { type: String, required: true },
  player2_username: { type: String, required: true },
  player1_color: { type: String, required: true },
  player2_color: { type: String, required: true },
  grid: { type: [[mongoose.Schema.Types.Mixed]], default: () => Array(5).fill().map(() => Array(5).fill(null)) },
  final_grid: { type: [[String]] },
  currentTurn: { type: String },
  status: { type: String, enum: ['playing', 'finished', 'forfeit'], default: 'playing' },
  result: { type: String, enum: ['win', 'loss', 'draw'], required: true },
  winner_username: { type: String },
  winner_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

export const Game = mongoose.model('Game', gameSchema);