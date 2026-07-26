/**
 * controllers/chatController.js
 * Handles fetching the current user's chat list, listing added contacts,
 * creating (or reusing) 1-to-1 chats, and deleting chats.
 */

const pool = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');

// GET /api/chats
// Returns every chat the logged-in user is part of, along with the other
// participant's name, online status, last message preview, and unread count.
const getMyChats = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const [rows] = await pool.query(
    `SELECT
        c.id AS id,
        CASE WHEN c.user_one_id = ? THEN c.user_two_id ELSE c.user_one_id END AS otherUserId,
        CASE WHEN c.user_one_id = ? THEN u2.name ELSE u1.name END AS otherUserName,
        CASE WHEN c.user_one_id = ? THEN u2.email ELSE u1.email END AS otherUserEmail,
        CASE WHEN c.user_one_id = ? THEN u2.avatar ELSE u1.avatar END AS otherUserAvatar,
        CASE WHEN c.user_one_id = ? THEN u2.is_online ELSE u1.is_online END AS isOnline,
        CASE WHEN c.user_one_id = ? THEN u2.last_seen ELSE u1.last_seen END AS lastSeen,
        lm.message AS lastMessage,
        lm.created_at AS lastMessageAt,
        COALESCE(unread.cnt, 0) AS unreadCount
     FROM chats c
     JOIN users u1 ON u1.id = c.user_one_id
     JOIN users u2 ON u2.id = c.user_two_id
     LEFT JOIN (
        SELECT m1.chat_id, m1.message, m1.created_at
        FROM messages m1
        INNER JOIN (
            SELECT chat_id, MAX(id) AS max_id FROM messages GROUP BY chat_id
        ) m2 ON m1.chat_id = m2.chat_id AND m1.id = m2.max_id
     ) lm ON lm.chat_id = c.id
     LEFT JOIN (
        SELECT chat_id, COUNT(*) AS cnt
        FROM messages
        WHERE sender_id != ? AND is_read = FALSE
        GROUP BY chat_id
     ) unread ON unread.chat_id = c.id
     WHERE c.user_one_id = ? OR c.user_two_id = ?
     ORDER BY lm.created_at DESC, c.created_at DESC`,
    [userId, userId, userId, userId, userId, userId, userId, userId, userId]
  );

  res.status(200).json({ success: true, data: rows });
});

// GET /api/chats/users
// Returns ONLY users/contacts that the current user has added via Add Contact by Email or started a conversation with.
// Prevents dumping random database users to the All Contacts list.
const getAllUsers = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const [rows] = await pool.query(
    `SELECT DISTINCT u.id, u.name, u.email, u.avatar, u.is_online, u.last_seen
     FROM users u
     JOIN chats c ON (c.user_one_id = u.id AND c.user_two_id = ?) OR (c.user_two_id = u.id AND c.user_one_id = ?)
     WHERE u.id != ?
     ORDER BY u.name ASC`,
    [userId, userId, userId]
  );

  res.status(200).json({ success: true, data: rows });
});

// POST /api/chats/start
// Body: { otherUserId }
const startChat = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { otherUserId } = req.body;

  if (!otherUserId) {
    return res.status(400).json({ success: false, message: 'otherUserId is required.' });
  }
  if (Number(otherUserId) === Number(userId)) {
    return res.status(400).json({ success: false, message: 'You cannot start a chat with yourself.' });
  }

  const [otherUserRows] = await pool.query('SELECT id, name, email, avatar FROM users WHERE id = ?', [otherUserId]);
  if (otherUserRows.length === 0) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  const [existingChat] = await pool.query(
    `SELECT id FROM chats
     WHERE (user_one_id = ? AND user_two_id = ?) OR (user_one_id = ? AND user_two_id = ?)`,
    [userId, otherUserId, otherUserId, userId]
  );

  let chatId;
  if (existingChat.length > 0) {
    chatId = existingChat[0].id;
  } else {
    const [result] = await pool.query('INSERT INTO chats (user_one_id, user_two_id) VALUES (?, ?)', [
      userId,
      otherUserId,
    ]);
    chatId = result.insertId;
  }

  res.status(200).json({
    success: true,
    data: {
      id: chatId,
      otherUserId: otherUserRows[0].id,
      otherUserName: otherUserRows[0].name,
      otherUserEmail: otherUserRows[0].email,
      otherUserAvatar: otherUserRows[0].avatar,
      lastMessage: null,
      lastMessageAt: null,
    },
  });
});

// DELETE /api/chats/:chatId
const deleteChat = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { chatId } = req.params;

  const [rows] = await pool.query(
    'SELECT id FROM chats WHERE id = ? AND (user_one_id = ? OR user_two_id = ?)',
    [chatId, userId, userId]
  );

  if (rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Chat not found.' });
  }

  await pool.query('DELETE FROM chats WHERE id = ?', [chatId]);

  res.status(200).json({ success: true, message: 'Chat deleted successfully.' });
});

// POST /api/chats/start-by-email
// Body: { email }
// Adds a contact by email and creates/returns the 1-to-1 chat.
const startChatByEmail = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { email } = req.body;

  if (!email || !email.trim()) {
    return res.status(400).json({ success: false, message: 'Email is required.' });
  }

  const [otherUserRows] = await pool.query('SELECT id, name, email, avatar FROM users WHERE email = ?', [
    email.trim().toLowerCase(),
  ]);
  if (otherUserRows.length === 0) {
    return res.status(404).json({ success: false, message: 'No user registered with this email address.' });
  }

  const otherUserId = otherUserRows[0].id;

  if (Number(otherUserId) === Number(userId)) {
    return res.status(400).json({ success: false, message: 'You cannot add yourself as a contact.' });
  }

  const [existingChat] = await pool.query(
    `SELECT id FROM chats
     WHERE (user_one_id = ? AND user_two_id = ?) OR (user_one_id = ? AND user_two_id = ?)`,
    [userId, otherUserId, otherUserId, userId]
  );

  let chatId;
  if (existingChat.length > 0) {
    chatId = existingChat[0].id;
  } else {
    const [result] = await pool.query('INSERT INTO chats (user_one_id, user_two_id) VALUES (?, ?)', [
      userId,
      otherUserId,
    ]);
    chatId = result.insertId;
  }

  res.status(200).json({
    success: true,
    data: {
      id: chatId,
      otherUserId: otherUserId,
      otherUserName: otherUserRows[0].name,
      otherUserEmail: otherUserRows[0].email,
      otherUserAvatar: otherUserRows[0].avatar,
      lastMessage: null,
      lastMessageAt: null,
    },
  });
});

module.exports = { getMyChats, getAllUsers, startChat, deleteChat, startChatByEmail };
