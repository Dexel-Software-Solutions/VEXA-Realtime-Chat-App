/**
 * routes/aiRoutes.js
 * Intelligent AI Assistant & Translation routes.
 */

const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { generateSmartReplies, summarizeThread, translateMessage } = require('../controllers/aiController');

router.use(authenticate);

router.post('/smart-reply', generateSmartReplies);
router.get('/summarize/:chatId', summarizeThread);
router.post('/translate', translateMessage);

module.exports = router;
