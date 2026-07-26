/**
 * routes/systemRoutes.js
 * Public Observability & System Health routes.
 */

const express = require('express');
const router = express.Router();
const { getSystemHealth } = require('../controllers/systemController');

router.get('/health', getSystemHealth);
router.get('/metrics', getSystemHealth);

module.exports = router;
