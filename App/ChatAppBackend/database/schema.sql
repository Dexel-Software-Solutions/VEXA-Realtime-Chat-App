-- =====================================================================
--  ChatApp Enterprise Database Schema (v4.0 - Single Device Session Lock)
-- =====================================================================

CREATE DATABASE IF NOT EXISTS chatapp_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE chatapp_db;

-- ---------------------------------------------------------------------
-- Table: users
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  current_token VARCHAR(500) DEFAULT NULL,
  avatar VARCHAR(500) DEFAULT NULL,
  is_online BOOLEAN NOT NULL DEFAULT FALSE,
  last_seen TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Table: chats
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chats (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_one_id INT NOT NULL,
  user_two_id INT NOT NULL,
  pinned_message_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_chats_user_one FOREIGN KEY (user_one_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_chats_user_two FOREIGN KEY (user_two_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_chat_users (user_one_id, user_two_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Table: messages
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  chat_id INT NOT NULL,
  sender_id INT NOT NULL,
  message VARCHAR(2000) NULL,
  image VARCHAR(500) NULL,
  audio VARCHAR(500) NULL,
  reactions VARCHAR(1000) DEFAULT NULL,
  expires_at TIMESTAMP NULL DEFAULT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMP NULL DEFAULT NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_messages_chat FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
  CONSTRAINT fk_messages_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Compound Indexes
-- ---------------------------------------------------------------------
CREATE INDEX idx_messages_chat_id_created ON messages(chat_id, id DESC);
CREATE INDEX idx_messages_is_read ON messages(chat_id, sender_id, is_read);
CREATE INDEX idx_messages_expires_at ON messages(expires_at);
CREATE INDEX idx_chats_user_one ON chats(user_one_id);
CREATE INDEX idx_chats_user_two ON chats(user_two_id);
