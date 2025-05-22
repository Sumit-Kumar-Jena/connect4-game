const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const path = require('path');
const app = express();
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server);
const Player = require('./models/Player');
require('dotenv').config();

mongoose.connect('mongodb://127.0.0.1:27017/connect4')
  .then(() => {
    console.log("✅ MongoDB connected successfully");
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
  });

const gameSocket = require('./sockets/gameSocket');
gameSocket(io);

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/profile/:nickname', async (req, res) => {
  const player = await Player.findOne({ nickname: req.params.nickname });
  if (!player) return res.status(404).json({});
  res.json(player);
});

server.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
