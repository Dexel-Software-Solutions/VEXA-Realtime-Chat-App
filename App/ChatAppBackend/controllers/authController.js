/**
 * controllers/authController.js
 * Handles user registration, login, profile management, password changes, secure logout,
 * and Single Active Device Session Enforcement.
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');
const { blacklistToken } = require('../middleware/auth');

const SALT_ROUNDS = 10;

const generateToken = (user) => {
  return jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET || 'supersecretkey_change_in_prod', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

// POST /api/auth/register
const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'Name, email and password are required.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
  }
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
  }

  const cleanEmail = email.toLowerCase().trim();
  const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [cleanEmail]);
  if (existing.length > 0) {
    return res.status(409).json({ success: false, message: 'This email is already registered.' });
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  const [result] = await pool.query(
    'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
    [name.trim(), cleanEmail, hashedPassword]
  );

  const user = { id: result.insertId, name: name.trim(), email: cleanEmail, avatar: null };
  const token = generateToken(user);

  // Single Device Session Locking: Store active session token
  await pool.query('UPDATE users SET current_token = ? WHERE id = ?', [token, user.id]);

  res.status(201).json({
    success: true,
    message: 'Account created successfully.',
    data: { token, user },
  });
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  const cleanEmail = email.toLowerCase().trim();
  const [rows] = await pool.query('SELECT id, name, email, avatar, password, current_token FROM users WHERE email = ?', [
    cleanEmail,
  ]);

  if (rows.length === 0) {
    return res.status(401).json({ success: false, message: 'Invalid email or password.' });
  }

  const userRecord = rows[0];
  const isPasswordCorrect = await bcrypt.compare(password, userRecord.password);

  if (!isPasswordCorrect) {
    return res.status(401).json({ success: false, message: 'Invalid email or password.' });
  }

  const user = { id: userRecord.id, name: userRecord.name, email: userRecord.email, avatar: userRecord.avatar };
  const token = generateToken(user);

  // Single Device Session Enforcement:
  // 1. Kick out previous active device via Socket.io
  if (global.io) {
    global.io.to(`user_${userRecord.id}`).emit('force_logout', {
      reason: 'Your account was logged into from another device.',
    });
  }

  // 2. Blacklist previous session token if existed
  if (userRecord.current_token) {
    blacklistToken(userRecord.current_token);
  }

  // 3. Lock new single active device token in DB
  await pool.query('UPDATE users SET current_token = ? WHERE id = ?', [token, userRecord.id]);

  res.status(200).json({
    success: true,
    message: 'Login successful.',
    data: { token, user },
  });
});

// POST /api/auth/logout
const logout = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  if (req.token) {
    blacklistToken(req.token);
  }
  // Clear active session token in DB
  await pool.query('UPDATE users SET current_token = NULL WHERE id = ?', [userId]);

  res.status(200).json({ success: true, message: 'Logged out successfully.' });
});

// GET /api/auth/me
const getProfile = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const [userRows] = await pool.query(
    'SELECT id, name, email, avatar, is_online, last_seen, created_at FROM users WHERE id = ?',
    [userId]
  );

  if (userRows.length === 0) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  const [countRows] = await pool.query(
    'SELECT COUNT(*) AS messageCount FROM messages WHERE sender_id = ?',
    [userId]
  );

  res.status(200).json({
    success: true,
    data: { ...userRows[0], messageCount: countRows[0].messageCount },
  });
});

// PUT /api/auth/profile
const updateProfile = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { name, avatar } = req.body;

  if (name !== undefined) {
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Name is required.' });
    }
    if (name.trim().length < 3) {
      return res.status(400).json({ success: false, message: 'Name must be at least 3 characters.' });
    }
    await pool.query('UPDATE users SET name = ? WHERE id = ?', [name.trim(), userId]);
  }

  if (avatar !== undefined) {
    await pool.query('UPDATE users SET avatar = ? WHERE id = ?', [avatar, userId]);
  }

  const [rows] = await pool.query(
    'SELECT id, name, email, avatar, is_online, last_seen, created_at FROM users WHERE id = ?',
    [userId]
  );

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully.',
    data: rows[0],
  });
});

// PUT /api/auth/password
const changePassword = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: 'Current password and new password are required.' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
  }

  const [rows] = await pool.query('SELECT password FROM users WHERE id = ?', [userId]);

  if (rows.length === 0) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  const isPasswordCorrect = await bcrypt.compare(currentPassword, rows[0].password);

  if (!isPasswordCorrect) {
    return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
  }

  const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId]);

  res.status(200).json({
    success: true,
    message: 'Password changed successfully.',
  });
});

module.exports = { register, login, logout, getProfile, updateProfile, changePassword };
