/**
 * routes/messageRoutes.js
 * Protected endpoints for message retrieval, sending, media upload, reactions, and deletion.
 */

const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  getMessages,
  sendMessage,
  reactToMessage,
  uploadMedia,
  markAsRead,
  deleteMessage,
  clearChat,
  deleteMessagesBatch,
} = require('../controllers/messageController');

router.use(authenticate);

router.post('/upload-media', upload.single('file'), uploadMedia);
router.post('/delete-batch', deleteMessagesBatch);
router.delete('/clear/:chatId', clearChat);
router.get('/:chatId', getMessages);
router.post('/:chatId', upload.single('file'), sendMessage);
router.post('/:messageId/react', reactToMessage);
router.put('/:chatId/read', markAsRead);
router.delete('/delete/:messageId', deleteMessage);

module.exports = router;
