/**
 * socket/socketHandler.js
 * Real-time WebSocket handler powered by Socket.io.
 * Manages user presence, instant messaging, typing indicators, and read receipts.
 */

const jwt = require('jsonwebtoken');
const pool = require('../config/db');

// Map of userId -> Set of socketIds (support multi-device logins)
const onlineUsers = new Map();

function initSocket(io) {
  // Authentication middleware for Socket.io
  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
    if (!token) {
      return next(new Error('Authentication token missing'));
    }

    try {
      const secret = process.env.JWT_SECRET || 'supersecretkey_change_in_prod';
      const decoded = jwt.verify(token, secret);
      socket.user = decoded; // { id, email }
      next();
    } catch (err) {
      next(new Error('Authentication failed: Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.user.id;
    console.log(`🔌 Socket connected: User ${userId} (${socket.id})`);

    // Track online user presence
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
      // Update DB presence only on first connection
      pool.query('UPDATE users SET is_online = TRUE, last_seen = NOW() WHERE id = ?', [userId]).catch(() => {});
      io.emit('user_presence', { userId, isOnline: true });
    }
    onlineUsers.get(userId).add(socket.id);

    // Join user's personal room for direct notifications
    socket.join(`user_${userId}`);

    // Join specific chat conversation
    socket.on('join_chat', ({ chatId }) => {
      if (chatId) {
        const roomName = `chat_${chatId}`;
        socket.join(roomName);
        console.log(`👤 User ${userId} joined room ${roomName}`);
      }
    });

    // Leave specific chat conversation
    socket.on('leave_chat', ({ chatId }) => {
      if (chatId) {
        socket.leave(`chat_${chatId}`);
      }
    });

    // Typing Indicators
    socket.on('typing_start', ({ chatId }) => {
      socket.to(`chat_${chatId}`).emit('user_typing', { chatId, userId, isTyping: true });
    });

    socket.on('typing_stop', ({ chatId }) => {
      socket.to(`chat_${chatId}`).emit('user_typing', { chatId, userId, isTyping: false });
    });

    // Mark messages read in real-time
    socket.on('mark_read', async ({ chatId }) => {
      try {
        await pool.query(
          'UPDATE messages SET is_read = TRUE, read_at = NOW() WHERE chat_id = ? AND sender_id != ? AND is_read = FALSE',
          [chatId, userId]
        );
        socket.to(`chat_${chatId}`).emit('messages_read', { chatId, readByUserId: userId });
      } catch (err) {
        console.error('Failed to mark messages as read via socket:', err);
      }
    });

    // Handle Disconnect
    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: User ${userId} (${socket.id})`);
      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          const now = new Date();
          pool.query('UPDATE users SET is_online = FALSE, last_seen = ? WHERE id = ?', [now, userId]).catch(() => {});
          io.emit('user_presence', { userId, isOnline: false, lastSeen: now.toISOString() });
        }
      }
    });
  });
}

function getIO() {
  return global.io;
}

module.exports = { initSocket, onlineUsers, getIO };
