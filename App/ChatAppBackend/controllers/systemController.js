/**
 * controllers/systemController.js
 * Enterprise Observability & Metrics Controller.
 * Exposes system health, memory stats, DB connection pool status, and socket gauges.
 */

const os = require('os');
const pool = require('../config/db');
const { onlineUsers } = require('../socket/socketHandler');

const getSystemHealth = async (req, res) => {
  const memoryUsage = process.memoryUsage();

  let dbStatus = 'healthy';
  let dbLatencyMs = 0;
  const dbStart = Date.now();

  try {
    await pool.query('SELECT 1');
    dbLatencyMs = Date.now() - dbStart;
  } catch (err) {
    dbStatus = 'unhealthy';
  }

  const activeSocketsCount = Array.from(onlineUsers.values()).reduce((acc, set) => acc + set.size, 0);

  res.status(200).json({
    status: dbStatus === 'healthy' ? 'UP' : 'DEGRADED',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    system: {
      platform: process.platform,
      arch: process.arch,
      uptimeSeconds: Math.floor(process.uptime()),
      cpuLoadAvg: os.loadavg(),
      totalMemoryMB: Math.round(os.totalmem() / 1024 / 1024),
      freeMemoryMB: Math.round(os.freemem() / 1024 / 1024),
    },
    process: {
      rssMB: Math.round(memoryUsage.rss / 1024 / 1024),
      heapTotalMB: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      heapUsedMB: Math.round(memoryUsage.heapUsed / 1024 / 1024),
    },
    database: {
      status: dbStatus,
      latencyMs: dbLatencyMs,
    },
    realtime: {
      onlineUsersCount: onlineUsers.size,
      activeSocketsCount,
    },
  });
};

module.exports = { getSystemHealth };
