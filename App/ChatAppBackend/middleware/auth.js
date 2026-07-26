/**
 * middleware/auth.js
 * High-performance JWT authentication middleware with Single Device Session Lock & Token Blacklisting.
 */

const jwt = require('jsonwebtoken');
const pool = require('../config/db');

// In-Memory Token Blacklist Set for Revocation on Logout
const blacklistedTokens = new Set();

const blacklistToken = (token) => {
  if (token) {
    blacklistedTokens.add(token);
    setTimeout(() => blacklistedTokens.delete(token), 24 * 60 * 60 * 1000);
  }
};

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication token is missing.' });
  }

  const token = authHeader.split(' ')[1];

  if (blacklistedTokens.has(token)) {
    return res.status(401).json({ success: false, message: 'Session has been invalidated. Please log in again.' });
  }

  try {
    const secret = process.env.JWT_SECRET || 'supersecretkey_change_in_prod';
    const decoded = jwt.verify(token, secret);

    // Single Active Device Session Validation:
    // Check if the current request's token matches the user's active session token in DB.
    const [rows] = await pool.query('SELECT current_token FROM users WHERE id = ?', [decoded.id]);
    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'User not found.' });
    }

    const dbToken = rows[0].current_token;
    if (dbToken && dbToken !== token) {
      return res.status(401).json({
        success: false,
        message: 'Session terminated. Your account was logged into from another device.',
      });
    }

    req.user = decoded; // { id, email }
    req.token = token;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ success: false, message: 'Invalid authentication token.' });
  }
};

module.exports = authenticate;
module.exports.blacklistToken = blacklistToken;
