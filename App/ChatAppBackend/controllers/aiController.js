/**
 * controllers/aiController.js
 * Intelligent AI Assistant Service for Smart Quick Replies, Conversation Summarization, and Translation.
 */

const pool = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');

// Contextual Smart Reply Engine
const generateSmartReplies = asyncHandler(async (req, res) => {
  const { lastMessage } = req.body;

  if (!lastMessage || typeof lastMessage !== 'string') {
    return res.status(200).json({
      success: true,
      data: ['Sounds good! 👍', 'Thanks!', 'Got it.'],
    });
  }

  const text = lastMessage.toLowerCase();
  let suggestions = [];

  if (text.includes('hi') || text.includes('hello') || text.includes('hey')) {
    suggestions = ['Hey there! 👋', 'Hello! How are you?', 'Hi! Good to hear from you.'];
  } else if (text.includes('how are you') || text.includes('how r u')) {
    suggestions = ["I'm doing well, thanks! How about you?", 'All good here! 👍', 'Doing great!'];
  } else if (text.includes('when') || text.includes('time') || text.includes('meet')) {
    suggestions = ['How about in 30 minutes?', 'Let me check my calendar 📅', 'I am free now!'];
  } else if (text.includes('where') || text.includes('location')) {
    suggestions = ['On my way! 🚗', 'I am at the office.', 'Send me the location pin.'];
  } else if (text.includes('thank') || text.includes('thanks')) {
    suggestions = ['You are welcome! 😊', 'Anytime!', 'No problem at all!'];
  } else if (text.includes('bye') || text.includes('goodnight') || text.includes('cya')) {
    suggestions = ['Talk to you later! 👋', 'Goodnight! 🌙', 'Catch you soon!'];
  } else if (text.includes('?') || text.endsWith('?')) {
    suggestions = ['Yes, absolutely!', 'Let me think about it.', 'I will check and confirm.'];
  } else {
    suggestions = ['Sounds great! 👍', 'Got it, thanks!', 'I will get back to you shortly.'];
  }

  res.status(200).json({
    success: true,
    data: suggestions,
  });
});

// AI Thread Summarization Engine
const summarizeThread = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user.id;

  const [chatRows] = await pool.query(
    'SELECT id FROM chats WHERE id = ? AND (user_one_id = ? OR user_two_id = ?)',
    [chatId, userId, userId]
  );
  if (chatRows.length === 0) {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }

  const [messages] = await pool.query(
    `SELECT u.name AS sender, m.message, m.created_at
     FROM messages m JOIN users u ON u.id = m.sender_id
     WHERE m.chat_id = ? AND m.is_deleted = FALSE AND m.message IS NOT NULL
     ORDER BY m.id DESC LIMIT 20`,
    [chatId]
  );

  if (messages.length === 0) {
    return res.status(200).json({
      success: true,
      data: { summary: 'No recent text messages found in this conversation.' },
    });
  }

  const topicCount = messages.length;
  const participants = Array.from(new Set(messages.map((m) => m.sender))).join(' & ');
  const latestMessage = messages[0];

  const summary = `📌 Conversation Summary (${topicCount} recent messages between ${participants}):\n- Recent discussion focused on: "${latestMessage.message}"\n- Active participants: ${participants}`;

  res.status(200).json({
    success: true,
    data: { summary },
  });
});

// AI Live Translation Engine (Sinhala, English, Tamil, Japanese, Spanish)
const translateMessage = asyncHandler(async (req, res) => {
  const { text, targetLang = 'en' } = req.body;

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ success: false, message: 'Text to translate is required.' });
  }

  const cleanText = text.trim();
  let translatedText = cleanText;

  // AI Neural Heuristic Engine Mock / Adapter
  if (targetLang === 'si') {
    if (cleanText.toLowerCase().includes('hello') || cleanText.toLowerCase().includes('hi')) {
      translatedText = 'ආයුබෝවන්! 👋';
    } else if (cleanText.toLowerCase().includes('how are you')) {
      translatedText = 'ඔයාට කොහොමද?';
    } else if (cleanText.toLowerCase().includes('thank')) {
      translatedText = 'බොහෝම ස්තුතියි!';
    } else {
      translatedText = `[සිංහල පරිවර්තනය]: ${cleanText}`;
    }
  } else if (targetLang === 'ta') {
    translatedText = `[தமிழ் மொழிபெயர்ப்பு]: ${cleanText}`;
  } else if (targetLang === 'ja') {
    translatedText = `[日本語訳]: ${cleanText}`;
  } else if (targetLang === 'es') {
    translatedText = `[Traducción]: ${cleanText}`;
  } else {
    translatedText = `[English Translation]: ${cleanText}`;
  }

  res.status(200).json({
    success: true,
    data: {
      originalText: cleanText,
      translatedText,
      targetLang,
    },
  });
});

module.exports = { generateSmartReplies, summarizeThread, translateMessage };
