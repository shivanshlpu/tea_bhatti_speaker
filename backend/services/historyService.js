import { queryOne, runSql } from '../db/connection.js';

/**
 * History Service — Write-through logger for every announcement event.
 * Every announce/repeat/cancel/emergency action is recorded for the History screen.
 */

/**
 * Log a new announcement event to the history table.
 * @param {Object} entry
 * @param {number} entry.itemId - Item ID (nullable for emergency custom text)
 * @param {string} entry.languageCode - Language code ('en', 'hi', 'bho')
 * @param {string} entry.textSpoken - The actual text that was/will be spoken
 * @param {string} entry.status - 'queued' | 'played' | 'failed' | 'cancelled'
 * @param {string} [entry.priority='normal'] - 'normal' | 'priority' | 'emergency'
 * @param {string} [entry.errorMessage] - Error details if status is 'failed'
 * @returns {number} The new history row ID
 */
export function logAnnouncement({ itemId, languageCode, textSpoken, status, priority = 'normal', errorMessage = null }) {
  try {
    const now = new Date().toISOString();

    const result = runSql(`
      INSERT INTO history (item_id, language_code, text_spoken, status, priority, triggered_at, played_at, error_message)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      itemId || null,
      languageCode,
      textSpoken,
      status,
      priority,
      now,
      status === 'played' ? now : null,
      errorMessage
    ]);

    return result.lastInsertRowid;
  } catch (err) {
    console.error('❌ Failed to log announcement:', err.message);
    return null;
  }
}

/**
 * Update an existing history entry's status (e.g., queued → played, queued → cancelled).
 * @param {number} historyId
 * @param {string} newStatus
 * @param {string} [errorMessage]
 */
export function updateHistoryStatus(historyId, newStatus, errorMessage = null) {
  try {
    const now = new Date().toISOString();

    if (newStatus === 'played') {
      runSql('UPDATE history SET status = ?, played_at = ? WHERE id = ?',
        [newStatus, now, historyId]);
    } else if (errorMessage) {
      runSql('UPDATE history SET status = ?, error_message = ? WHERE id = ?',
        [newStatus, errorMessage, historyId]);
    } else {
      runSql('UPDATE history SET status = ? WHERE id = ?',
        [newStatus, historyId]);
    }
  } catch (err) {
    console.error('❌ Failed to update history status:', err.message);
  }
}

/**
 * Get the most recent history entry (for the "repeat last" feature).
 * @returns {Object|null}
 */
export function getLastAnnouncement() {
  try {
    return queryOne("SELECT * FROM history WHERE status = 'played' ORDER BY played_at DESC LIMIT 1");
  } catch (err) {
    console.error('❌ Failed to fetch last announcement:', err.message);
    return null;
  }
}
