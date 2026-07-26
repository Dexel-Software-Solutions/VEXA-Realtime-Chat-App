/**
 * routes/chatRoutes.js
 * All routes here require a valid JWT (protected by the authenticate middleware).
 */

const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { getMyChats, getAllUsers, startChat, deleteChat, startChatByEmail } = require('../controllers/chatController');
const { setTyping, getTyping } = require('../controllers/typingController');

router.use(authenticate);

router.get('/', getMyChats);
router.get('/users', getAllUsers);
router.post('/start', startChat);
router.post('/start-by-email', startChatByEmail);
router.delete('/:chatId', deleteChat);
router.post('/:chatId/typing', setTyping);
router.get('/:chatId/typing', getTyping);

module.exports = router;

