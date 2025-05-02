import mongoose from 'mongoose';

const waitingPlayerSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  socketId: String,
  joinedAt: {
    type: Date,
    default: Date.now
  }
}, { collection: 'waitingplayers' }); // Explicit collection name

export const WaitingPlayer = mongoose.model('WaitingPlayer', waitingPlayerSchema);
