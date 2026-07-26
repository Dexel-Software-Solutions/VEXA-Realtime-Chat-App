/**
 * routes/authRoutes.js
 * Auth routes with Rate-Limiting security and Logout revocation.
 */

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authenticate = require('../middleware/auth');
const { register, login, logout, getProfile, updateProfile, changePassword } = require('../controllers/authController');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many login/registration attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);
router.put('/password', authenticate, changePassword);

module.exports = router;
