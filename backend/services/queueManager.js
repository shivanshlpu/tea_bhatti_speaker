import { v4 as uuidv4 } from 'uuid';
import { queryOne } from '../db/connection.js';
import { logAnnouncement, updateHistoryStatus } from './historyService.js';

/**
 * Queue Manager — FIFO announcement queue with priority/emergency override.
 *
 * State machine per announcement: queued → synthesizing → playing → done
 *   (or → failed / → cancelled from any state before done)
 *
 * Rules:
 *  - FIFO by default
 *  - No overlap — only one announcement plays at a time
 *  - Priority — inserted after currently-playing, before normal items
 *  - Emergency — pre-empts: fades out current, plays immediately
 *  - Dedup/spam guard — same itemId within cooldown window is ignored
 *  - Repeat — re-uses last history entry's text
 *  - Cancel — removes one entry by id, or clears entire queue
 */

class QueueManager {
  constructor() {
    /** @type {Array<Object>} The announcement queue */
    this.queue = [];

    /** @type {Object|null} Currently playing announcement */
    this.nowPlaying = null;

    /** @type {Map<number, number>} itemId → last enqueue timestamp (for dedup) */
    this.lastEnqueueTime = new Map();

    /** @type {Function|null} Callback when an item is ready to play */
    this.onReadyToPlay = null;

    /** @type {Function|null} Callback when emergency pre-empt is needed */
    this.onEmergencyPreempt = null;
  }

  /**
   * Get the repeat cooldown from settings.
   * @returns {number} Cooldown in ms
   */
  getCooldownMs() {
    try {
      const settings = queryOne('SELECT repeat_cooldown_ms FROM settings WHERE id = 1');
      return settings?.repeat_cooldown_ms || 800;
    } catch {
      return 800;
    }
  }

  /**
   * Enqueue a new announcement.
   * @param {Object} announcement
   * @param {number} announcement.itemId
   * @param {string} announcement.text
   * @param {string} announcement.languageCode
   * @param {string} [announcement.priority='normal']
   * @returns {{ success: boolean, id?: string, error?: string, historyId?: number }}
   */
  enqueue({ itemId, text, languageCode, priority = 'normal' }) {
    const now = Date.now();
    const cooldownMs = this.getCooldownMs();

    // Dedup check (Section 7: spam guard)
    if (itemId && priority === 'normal') {
      const lastTime = this.lastEnqueueTime.get(itemId);
      if (lastTime && (now - lastTime) < cooldownMs) {
        // Also check if same item is already in queue
        const alreadyQueued = this.queue.some(q => q.itemId === itemId);
        const isPlaying = this.nowPlaying?.itemId === itemId;
        if (alreadyQueued || isPlaying) {
          return { success: false, error: 'Already announced' };
        }
      }
    }

    const id = uuidv4();
    const entry = {
      id,
      itemId,
      text,
      languageCode,
      priority,
      enqueuedAt: now,
      state: 'queued'
    };

    // Log to history
    const historyId = logAnnouncement({
      itemId,
      languageCode,
      textSpoken: text,
      status: 'queued',
      priority
    });
    entry.historyId = historyId;

    // Track enqueue time for dedup
    if (itemId) {
      this.lastEnqueueTime.set(itemId, now);
    }

    // Insert based on priority
    if (priority === 'emergency') {
      // Emergency: position 0 (plays next, or pre-empts current)
      this.queue.unshift(entry);

      // If something is playing, pre-empt it
      if (this.nowPlaying && this.onEmergencyPreempt) {
        this.onEmergencyPreempt();
      }
    } else if (priority === 'priority') {
      // Priority: after any emergencies and after currently playing,
      // but before normal items
      const insertIdx = this.queue.findIndex(q => q.priority === 'normal');
      if (insertIdx === -1) {
        this.queue.push(entry);
      } else {
        this.queue.splice(insertIdx, 0, entry);
      }
    } else {
      // Normal: end of queue (FIFO)
      this.queue.push(entry);
    }

    // If nothing is playing, trigger playback
    if (!this.nowPlaying) {
      this._playNext();
    }

    return { success: true, id, historyId };
  }

  /**
   * Cancel a queued announcement by queue ID, or all queued items.
   * @param {string} [queueId] - Specific queue entry to cancel
   * @param {boolean} [all=false] - Cancel all queued items
   * @returns {{ success: boolean, cancelled: number }}
   */
  cancel({ queueId, all = false } = {}) {
    let cancelled = 0;

    if (all) {
      for (const entry of this.queue) {
        if (entry.historyId) {
          updateHistoryStatus(entry.historyId, 'cancelled');
        }
        cancelled++;
      }
      this.queue = [];
    } else if (queueId) {
      const idx = this.queue.findIndex(q => q.id === queueId);
      if (idx !== -1) {
        const entry = this.queue.splice(idx, 1)[0];
        if (entry.historyId) {
          updateHistoryStatus(entry.historyId, 'cancelled');
        }
        cancelled = 1;
      }
    }

    return { success: true, cancelled };
  }

  /**
   * Mark the current announcement as done and play the next one.
   */
  markDone() {
    if (this.nowPlaying) {
      if (this.nowPlaying.historyId) {
        updateHistoryStatus(this.nowPlaying.historyId, 'played');
      }
      this.nowPlaying = null;
    }
    this._playNext();
  }

  /**
   * Mark the current announcement as failed.
   * @param {string} errorMessage
   */
  markFailed(errorMessage) {
    if (this.nowPlaying) {
      if (this.nowPlaying.historyId) {
        updateHistoryStatus(this.nowPlaying.historyId, 'failed', errorMessage);
      }
      this.nowPlaying = null;
    }
    this._playNext();
  }

  /**
   * Get the current queue state (for UI display).
   * @returns {{ nowPlaying: Object|null, queue: Array, queueLength: number }}
   */
  getState() {
    return {
      nowPlaying: this.nowPlaying,
      queue: this.queue.map(q => ({
        id: q.id,
        itemId: q.itemId,
        text: q.text,
        priority: q.priority,
        state: q.state
      })),
      queueLength: this.queue.length
    };
  }

  /**
   * Internal: pop next item from queue and trigger playback.
   */
  _playNext() {
    if (this.queue.length === 0) {
      this.nowPlaying = null;
      return;
    }

    const next = this.queue.shift();
    next.state = 'synthesizing';
    this.nowPlaying = next;

    if (this.onReadyToPlay) {
      this.onReadyToPlay(next);
    }
  }
}

// Singleton instance
export const queueManager = new QueueManager();
