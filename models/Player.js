const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  nickname: { type: String, required: true, unique: true },
  totalMatches: { type: Number, default: 0 },
  wins: { type: Number, default: 0 },
  losses: { type: Number, default: 0 },
});

module.exports = mongoose.model('Player', playerSchema);
