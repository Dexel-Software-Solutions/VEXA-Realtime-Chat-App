/**
 * config/autoMigrate.js
 * Automatic Schema Migration Service.
 * Safely updates existing MySQL tables to add missing columns across any MySQL version.
 */

async function runAutoMigrations(pool) {
  try {
    // Check missing columns in 'users' table
    const [userCols] = await pool.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'`
    );
    const existingUserCols = new Set(userCols.map((c) => c.COLUMN_NAME.toLowerCase()));

    if (!existingUserCols.has('current_token')) {
      console.log('🔄 Auto-migrating: Adding missing column "current_token" to users table...');
      await pool.query('ALTER TABLE users ADD COLUMN current_token VARCHAR(500) DEFAULT NULL AFTER password');
    }

    // Check missing columns in 'messages' table
    const [messageCols] = await pool.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'messages'`
    );
    const existingMessageCols = new Set(messageCols.map((c) => c.COLUMN_NAME.toLowerCase()));

    if (!existingMessageCols.has('audio')) {
      console.log('🔄 Auto-migrating: Adding missing column "audio" to messages table...');
      await pool.query('ALTER TABLE messages ADD COLUMN audio VARCHAR(500) NULL AFTER image');
    }

    if (!existingMessageCols.has('reactions')) {
      console.log('🔄 Auto-migrating: Adding missing column "reactions" to messages table...');
      await pool.query('ALTER TABLE messages ADD COLUMN reactions VARCHAR(1000) DEFAULT NULL AFTER audio');
    }

    if (!existingMessageCols.has('expires_at')) {
      console.log('🔄 Auto-migrating: Adding missing column "expires_at" to messages table...');
      await pool.query('ALTER TABLE messages ADD COLUMN expires_at TIMESTAMP NULL DEFAULT NULL AFTER reactions');
    }

    // Check missing columns in 'chats' table
    const [chatCols] = await pool.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chats'`
    );
    const existingChatCols = new Set(chatCols.map((c) => c.COLUMN_NAME.toLowerCase()));

    if (!existingChatCols.has('pinned_message_id')) {
      console.log('🔄 Auto-migrating: Adding missing column "pinned_message_id" to chats table...');
      await pool.query('ALTER TABLE chats ADD COLUMN pinned_message_id INT NULL');
    }

    console.log('✅ Database schema auto-migration completed successfully.');
  } catch (err) {
    console.warn('⚠️ Auto-migration check warning:', err.message);
  }
}

module.exports = { runAutoMigrations };
