/**
 * utils/cronCleanup.js
 * Background worker service for cleaning up unreferenced orphan media uploads.
 */

const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

const uploadsDir = path.join(__dirname, '..', 'uploads');

async function cleanupOrphanUploads() {
  if (!fs.existsSync(uploadsDir)) return;

  try {
    const filesOnDisk = fs.readdirSync(uploadsDir);
    if (filesOnDisk.length === 0) return;

    // Get all referenced image URLs from DB
    const [rows] = await pool.query('SELECT image FROM messages WHERE image IS NOT NULL AND image != ""');
    const referencedFiles = new Set(
      rows.map((r) => r.image.replace('/uploads/', '')).filter(Boolean)
    );

    const now = Date.now();
    const ONE_HOUR = 60 * 60 * 1000;
    let deletedCount = 0;

    for (const filename of filesOnDisk) {
      if (!referencedFiles.has(filename)) {
        const filePath = path.join(uploadsDir, filename);
        try {
          const stats = fs.statSync(filePath);
          if (now - stats.mtimeMs > ONE_HOUR) {
            fs.unlinkSync(filePath);
            deletedCount++;
          }
        } catch (e) {
          // File stat/unlink error
        }
      }
    }

    if (deletedCount > 0) {
      console.log(`🧹 Cleaned up ${deletedCount} unreferenced orphan media files.`);
    }
  } catch (err) {
    console.error('❌ Error during orphan uploads cleanup:', err.message);
  }
}

function startCleanupWorker(intervalMs = 6 * 60 * 60 * 1000) {
  // Run initial cleanup after 1 minute
  setTimeout(cleanupOrphanUploads, 60 * 1000);
  // Schedule periodic cleanup
  setInterval(cleanupOrphanUploads, intervalMs);
}

module.exports = { cleanupOrphanUploads, startCleanupWorker };
