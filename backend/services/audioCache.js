import { createHash } from 'crypto';
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { queryOne, queryAll, runSql } from '../db/connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CACHE_DIR = join(__dirname, '..', '..', 'audio-cache');

// Ensure cache directory exists
if (!existsSync(CACHE_DIR)) {
  mkdirSync(CACHE_DIR, { recursive: true });
}

/**
 * Generate a SHA-256 content hash for cache lookup.
 * @param {string} text
 * @param {string} languageCode
 * @param {string} voiceModel
 * @returns {string} Hex hash string
 */
export function getContentHash(text, languageCode, voiceModel) {
  return createHash('sha256')
    .update(`${text}|${languageCode}|${voiceModel}`)
    .digest('hex');
}

/**
 * Check if a cached audio file exists for the given content.
 * Updates last_used_at on cache hit.
 * @param {string} contentHash
 * @returns {string|null} File path if cached, null if not
 */
export function getCachedAudio(contentHash) {
  try {
    const entry = queryOne('SELECT * FROM audio_cache WHERE content_hash = ?', [contentHash]);

    if (entry && existsSync(entry.file_path)) {
      // Update last_used_at (LRU tracking)
      runSql('UPDATE audio_cache SET last_used_at = ? WHERE content_hash = ?',
        [new Date().toISOString(), contentHash]);
      return entry.file_path;
    }

    // Entry exists in DB but file is missing — clean up
    if (entry) {
      runSql('DELETE FROM audio_cache WHERE content_hash = ?', [contentHash]);
    }

    return null;
  } catch (err) {
    console.error('❌ Audio cache lookup failed:', err.message);
    return null;
  }
}

/**
 * Store a synthesized audio file in the cache.
 * @param {string} contentHash
 * @param {Buffer} audioData - Raw WAV audio data
 * @returns {string} Path to the saved file
 */
export function cacheAudio(contentHash, audioData) {
  const filePath = join(CACHE_DIR, `${contentHash}.wav`);
  const now = new Date().toISOString();

  try {
    writeFileSync(filePath, audioData);

    runSql(`
      INSERT OR REPLACE INTO audio_cache (content_hash, file_path, created_at, last_used_at)
      VALUES (?, ?, ?, ?)
    `, [contentHash, filePath, now, now]);

    return filePath;
  } catch (err) {
    console.error('❌ Audio cache write failed:', err.message);
    return null;
  }
}

/**
 * Get total cache size info.
 * @returns {{ count: number, directory: string }}
 */
export function getCacheInfo() {
  try {
    const result = queryOne('SELECT COUNT(*) as count FROM audio_cache');
    return { count: result?.count || 0, directory: CACHE_DIR };
  } catch (err) {
    return { count: 0, directory: CACHE_DIR };
  }
}

/**
 * Clear the entire audio cache (files + DB entries).
 */
export function clearCache() {
  try {
    const entries = queryAll('SELECT file_path FROM audio_cache');

    for (const entry of entries) {
      try {
        if (existsSync(entry.file_path)) {
          unlinkSync(entry.file_path);
        }
      } catch { /* ignore individual file delete errors */ }
    }

    runSql('DELETE FROM audio_cache');
    console.log(`🗑️ Audio cache cleared (${entries.length} files)`);
  } catch (err) {
    console.error('❌ Cache clear failed:', err.message);
  }
}
