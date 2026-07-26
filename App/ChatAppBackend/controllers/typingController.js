/**
 * controllers/typingController.js
 * Handles typing indicator state using an in-memory store.
 * No database persistence needed — typing status is ephemeral.
 */

const { asyncHandler } = require('../middleware/errorHandler');

// In-memory store: Map<string, number> where key = 'chatId_userId' and value = timestamp
const typingStore = new Map();

// Clean up expired entries every 30 seconds to prevent memory leaks.
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of typingStore) {
    if (now - timestamp > 5000) {
      typingStore.delete(key);
    }
  }
}, 30000);

// POST /api/chats/:chatId/typing
const setTyping = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user.id;
  const key = `${chatId}_${userId}`;
  typingStore.set(key, Date.now());
  res.status(200).json({ success: true });
});

// GET /api/chats/:chatId/typing
const getTyping = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user.id;
  const now = Date.now();

  // Find if the OTHER user in this chat is typing (not the current user)
  let isTyping = false;
  for (const [key, timestamp] of typingStore) {
    if (key.startsWith(`${chatId}_`) && !key.endsWith(`_${userId}`) && (now - timestamp < 4000)) {
      isTyping = true;
      break;
    }
  }

  res.status(200).json({ success: true, data: { isTyping } });
});

module.exports = { setTyping, getTyping };
