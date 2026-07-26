/**
 * controllers/messageController.js
 * Handles fetching message history with cursor pagination, sending messages
 * (text, image, audio), live emoji reactions, and soft deletes.
 */

const pool = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');

const verifyChatAccess = async (chatId, userId) => {
  const [rows] = await pool.query(
    'SELECT * FROM chats WHERE id = ? AND (user_one_id = ? OR user_two_id = ?)',
    [chatId, userId, userId]
  );
  return rows.length > 0 ? rows[0] : null;
};

const sanitize = (text) => (text ? text.replace(/[<>]/g, '') : null);

// GET /api/messages/:chatId?limit=30&beforeId=100
const getMessages = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { chatId } = req.params;
  const limit = Math.min(parseInt(req.query.limit, 10) || 30, 100);
  const beforeId = req.query.beforeId ? parseInt(req.query.beforeId, 10) : null;

  const chat = await verifyChatAccess(chatId, userId);
  if (!chat) {
    return res.status(403).json({ success: false, message: 'You do not have access to this chat.' });
  }

  let query = `
    SELECT m.id, m.chat_id AS chatId, m.sender_id AS senderId, u.name AS senderName,
           CASE WHEN m.is_deleted = TRUE THEN NULL ELSE m.message END AS message,
           CASE WHEN m.is_deleted = TRUE THEN NULL ELSE m.image END AS image,
           CASE WHEN m.is_deleted = TRUE THEN NULL ELSE m.audio END AS audio,
           m.reactions, m.is_read AS isRead, m.read_at AS readAt, m.is_deleted AS isDeleted,
           m.created_at AS createdAt
    FROM messages m
    JOIN users u ON u.id = m.sender_id
    WHERE m.chat_id = ?
  `;
  const params = [chatId];

  if (beforeId) {
    query += ` AND m.id < ?`;
    params.push(beforeId);
  }

  query += ` ORDER BY m.id DESC LIMIT ?`;
  params.push(limit);

  const [rows] = await pool.query(query, params);
  const orderedRows = rows.reverse();

  res.status(200).json({
    success: true,
    data: orderedRows,
    hasMore: rows.length === limit,
  });
});

// POST /api/messages/:chatId
const sendMessage = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { chatId } = req.params;
  const { message, image, audio } = req.body;

  let mediaPath = image || audio || null;
  let isAudio = false;

  if (req.file) {
    mediaPath = `/uploads/${req.file.filename}`;
    if (req.file.mimetype.startsWith('audio/')) {
      isAudio = true;
    }
  }

  if ((!message || !message.trim()) && !mediaPath) {
    return res.status(400).json({ success: false, message: 'Message content or media attachment is required.' });
  }

  const chat = await verifyChatAccess(chatId, userId);
  if (!chat) {
    return res.status(403).json({ success: false, message: 'You do not have access to this chat.' });
  }

  const cleanMessage = message ? sanitize(message.trim()) : null;
  const imageVal = !isAudio ? mediaPath : null;
  const audioVal = isAudio ? mediaPath : null;

  const [result] = await pool.query(
    'INSERT INTO messages (chat_id, sender_id, message, image, audio) VALUES (?, ?, ?, ?, ?)',
    [chatId, userId, cleanMessage, imageVal, audioVal]
  );

  const [rows] = await pool.query(
    `SELECT m.id, m.chat_id AS chatId, m.sender_id AS senderId, u.name AS senderName,
            m.message, m.image, m.audio, m.reactions, m.is_read AS isRead, m.read_at AS readAt,
            m.is_deleted AS isDeleted, m.created_at AS createdAt
     FROM messages m JOIN users u ON u.id = m.sender_id WHERE m.id = ?`,
    [result.insertId]
  );

  const newMsg = rows[0];

  if (global.io) {
    global.io.to(`chat_${chatId}`).emit('new_message', newMsg);
    const recipientId = chat.user_one_id === userId ? chat.user_two_id : chat.user_one_id;
    global.io.to(`user_${recipientId}`).emit('chat_updated', {
      chatId: Number(chatId),
      lastMessage: newMsg.message || (newMsg.image ? '📷 Photo' : '🎵 Voice Note'),
      lastMessageAt: newMsg.createdAt,
      senderId: userId,
    });
  }

  res.status(201).json({ success: true, data: newMsg });
});

// POST /api/messages/:messageId/react
// Attach or update emoji reaction on a message
const reactToMessage = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { messageId } = req.params;
  const { emoji } = req.body;

  if (!emoji) {
    return res.status(400).json({ success: false, message: 'Emoji is required.' });
  }

  const [rows] = await pool.query('SELECT id, chat_id, reactions FROM messages WHERE id = ?', [messageId]);
  if (rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Message not found.' });
  }

  const msg = rows[0];
  const chat = await verifyChatAccess(msg.chat_id, userId);
  if (!chat) {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }

  let reactionsMap = {};
  try {
    if (msg.reactions) {
      reactionsMap = JSON.parse(msg.reactions);
    }
  } catch (e) {
    reactionsMap = {};
  }

  // Toggle reaction: if same user selected same emoji, remove it; else set/update
  if (reactionsMap[userId] === emoji) {
    delete reactionsMap[userId];
  } else {
    reactionsMap[userId] = emoji;
  }

  const updatedReactionsStr = Object.keys(reactionsMap).length > 0 ? JSON.stringify(reactionsMap) : null;

  await pool.query('UPDATE messages SET reactions = ? WHERE id = ?', [updatedReactionsStr, messageId]);

  if (global.io) {
    global.io.to(`chat_${msg.chat_id}`).emit('message_reaction', {
      messageId: Number(messageId),
      reactions: updatedReactionsStr,
    });
  }

  res.status(200).json({ success: true, data: { reactions: updatedReactionsStr } });
});

// POST /api/messages/upload-media
const uploadMedia = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded.' });
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  res.status(200).json({ success: true, data: { url: fileUrl } });
});

// PUT /api/messages/:chatId/read
const markAsRead = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { chatId } = req.params;

  const chat = await verifyChatAccess(chatId, userId);
  if (!chat) {
    return res.status(403).json({ success: false, message: 'You do not have access to this chat.' });
  }

  await pool.query(
    'UPDATE messages SET is_read = TRUE, read_at = NOW() WHERE chat_id = ? AND sender_id != ? AND is_read = FALSE',
    [chatId, userId]
  );

  if (global.io) {
    global.io.to(`chat_${chatId}`).emit('messages_read', { chatId: Number(chatId), readByUserId: userId });
  }

  res.status(200).json({ success: true, message: 'Messages marked as read.' });
});

// DELETE /api/messages/delete/:messageId
const deleteMessage = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { messageId } = req.params;

  const [rows] = await pool.query('SELECT id, chat_id, sender_id FROM messages WHERE id = ?', [messageId]);

  if (rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Message not found.' });
  }

  if (rows[0].sender_id !== userId) {
    return res.status(403).json({ success: false, message: 'You can only delete your own messages.' });
  }

  await pool.query('UPDATE messages SET is_deleted = TRUE, message = NULL, image = NULL, audio = NULL, reactions = NULL WHERE id = ?', [messageId]);

  if (global.io) {
    global.io.to(`chat_${rows[0].chat_id}`).emit('message_deleted', { messageId: Number(messageId) });
  }

  res.status(200).json({ success: true, message: 'Message deleted successfully.' });
});

// DELETE /api/messages/clear/:chatId
const clearChat = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { chatId } = req.params;

  const chat = await verifyChatAccess(chatId, userId);
  if (!chat) {
    return res.status(403).json({ success: false, message: 'You do not have access to this chat.' });
  }

  await pool.query('UPDATE messages SET is_deleted = TRUE, message = NULL, image = NULL, audio = NULL, reactions = NULL WHERE chat_id = ?', [chatId]);

  if (global.io) {
    global.io.to(`chat_${chatId}`).emit('chat_cleared', { chatId: Number(chatId) });
  }

  res.status(200).json({ success: true, message: 'Chat history cleared successfully.' });
});

// POST /api/messages/delete-batch
const deleteMessagesBatch = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { messageIds } = req.body;

  if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
    return res.status(400).json({ success: false, message: 'No message IDs provided.' });
  }

  const [rows] = await pool.query(
    'SELECT id, chat_id FROM messages WHERE id IN (?) AND sender_id = ?',
    [messageIds, userId]
  );

  const validIds = rows.map((r) => r.id);
  if (validIds.length === 0) {
    return res.status(400).json({ success: false, message: 'No valid messages found to delete.' });
  }

  await pool.query(
    'UPDATE messages SET is_deleted = TRUE, message = NULL, image = NULL, audio = NULL, reactions = NULL WHERE id IN (?)',
    [validIds]
  );

  if (global.io && rows.length > 0) {
    global.io.to(`chat_${rows[0].chat_id}`).emit('messages_batch_deleted', { messageIds: validIds });
  }

  res.status(200).json({ success: true, message: `${validIds.length} messages deleted successfully.` });
});

module.exports = {
  getMessages,
  sendMessage,
  reactToMessage,
  uploadMedia,
  markAsRead,
  deleteMessage,
  clearChat,
  deleteMessagesBatch,
};
