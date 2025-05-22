const Player = require('../models/Player');

let waitingQueue = [];
let rooms = {};
let rematchRequests = {};

module.exports = function (io) {
  io.on('connection', (socket) => {
    let currentRoom = null;
    let currentNickname = null;

    socket.on('joinGame', async (nickname) => {
      currentNickname = nickname;
      socket.nickname = nickname;

      let player = await Player.findOne({ nickname });
      if (!player) {
        player = new Player({ nickname });
        await player.save();
      }

      waitingQueue.push(socket);

      if (waitingQueue.length >= 2) {
        const player1 = waitingQueue.shift();
        const player2 = waitingQueue.shift();

        const room = `room-${player1.id}-${player2.id}`;
        currentRoom = room;
        rooms[room] = [player1, player2];
        rematchRequests[room] = [];

        player1.join(room);
        player2.join(room);

        io.to(room).emit('startGame', {
          room,
          players: [
            { id: player1.id, nickname: player1.nickname, player: 1 },
            { id: player2.id, nickname: player2.nickname, player: 2 },
          ],
        });
      }
    });

    socket.on('makeMove', ({ row, col, room }) => {
      socket.to(room).emit('moveMade', { row, col });
    });

    socket.on('gameOver', async ({ room, winner }) => {
      const players = rooms[room];
      if (!players) return;

      for (const sock of players) {
        const player = await Player.findOne({ nickname: sock.nickname });
        if (player) {
          player.totalMatches++;
          if (sock.nickname === winner) player.wins++;
          else player.losses++;
          await player.save();
        }
      }

      io.to(room).emit('gameEnded', { winner });
    });

    socket.on('rematchRequest', ({ room }) => {
      if (!rematchRequests[room]) rematchRequests[room] = [];
      if (!rematchRequests[room].includes(socket.id)) {
        rematchRequests[room].push(socket.id);
      }

      socket.to(room).emit('rematchOffer');

      if (rematchRequests[room].length === 2) {
        io.to(room).emit('rematchStart');
        rematchRequests[room] = [];
      }
    });

    socket.on('rematchAccepted', ({ room }) => {
      socket.to(room).emit('rematchStart');
      rematchRequests[room] = [];
    });

    socket.on('rematchDeclined', ({ room }) => {
      socket.to(room).emit('rematchDeclined');
      rematchRequests[room] = [];
    });

    socket.on('abortGame', ({ room }) => {
      socket.to(room).emit('opponentAborted');
      if (rooms[room]) delete rooms[room];
      if (rematchRequests[room]) delete rematchRequests[room];
    });

    socket.on('disconnect', () => {
      waitingQueue = waitingQueue.filter(s => s.id !== socket.id);

      if (currentRoom) {
        socket.to(currentRoom).emit('opponentDisconnected');
        delete rooms[currentRoom];
        delete rematchRequests[currentRoom];
      }
    });
  });
};
