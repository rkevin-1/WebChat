const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Listen for new chat messages
io.on('connection', (socket) => {
  socket.on('new-message', (senderName) => {
    console.log(`[SOCKET] new-message from:`, senderName, 'socket.id:', socket.id);
    // Broadcast to all clients except sender, include senderName
    socket.broadcast.emit('refresh-messages', senderName);
    console.log(`[SOCKET] refresh-messages broadcasted with senderName:`, senderName);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`);
});
