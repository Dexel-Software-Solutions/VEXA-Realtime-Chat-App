/**
 * config/db.js
 * MySQL connection pool configuration with automatic database schema migration.
 */

const mysql = require('mysql2/promise');
const { runAutoMigrations } = require('./autoMigrate');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'dexel',
  database: process.env.DB_NAME || 'chatapp_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true,
});

// Verify connection and run automatic schema migration on startup
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Connected to MySQL database:', process.env.DB_NAME || 'chatapp_db');
    connection.release();

    // Auto-migrate database tables to add missing columns seamlessly
    await runAutoMigrations(pool);
  } catch (error) {
    console.error('❌ Failed to connect to MySQL database:', error.message);
    console.error('   Please check your .env database credentials and ensure MySQL is running.');
  }
})();

module.exports = pool;
