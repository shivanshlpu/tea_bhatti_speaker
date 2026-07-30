/**
 * Audio Manager — Handles playback, volume, fade in/out, device selection.
 *
 * In the current architecture (Web Speech API mode), actual audio playback
 * happens client-side. This module manages the playback state and coordinates
 * with the queue manager.
 *
 * When Piper TTS is integrated, this module will handle server-side .wav
 * playback via the system audio device.
 */

class AudioManager {
  constructor() {
    /** @type {boolean} Whether audio is currently playing */
    this._isPlaying = false;

    /** @type {number} Volume level 0.0-1.0 */
    this._volume = 0.9;

    /** @type {number} Fade duration in ms */
    this._fadeMs = 150;

    /** @type {string|null} Selected audio device ID */
    this._deviceId = null;

    /** @type {Function|null} Callback when playback completes */
    this.onPlaybackComplete = null;

    /** @type {Function|null} Callback when playback fails */
    this.onPlaybackError = null;
  }

  /**
   * Check if audio is currently playing.
   * @returns {boolean}
   */
  isPlaying() {
    return this._isPlaying;
  }

  /**
   * Set volume level.
   * @param {number} level - 0.0 to 1.0
   */
  setVolume(level) {
    this._volume = Math.max(0, Math.min(1, level));
  }

  /**
   * Get current volume level.
   * @returns {number}
   */
  getVolume() {
    return this._volume;
  }

  /**
   * Set fade duration in milliseconds.
   * @param {number} ms
   */
  setFadeMs(ms) {
    this._fadeMs = Math.max(0, ms);
  }

  /**
   * Set the audio output device ID.
   * @param {string} deviceId
   */
  setDevice(deviceId) {
    this._deviceId = deviceId;
  }

  /**
   * Mark that playback has started (called by client via Socket.IO or API).
   */
  markPlaybackStarted() {
    this._isPlaying = true;
  }

  /**
   * Mark that playback has completed (called by client via Socket.IO or API).
   */
  markPlaybackComplete() {
    this._isPlaying = false;
    if (this.onPlaybackComplete) {
      this.onPlaybackComplete();
    }
  }

  /**
   * Mark that playback has failed.
   * @param {string} errorMessage
   */
  markPlaybackFailed(errorMessage) {
    this._isPlaying = false;
    if (this.onPlaybackError) {
      this.onPlaybackError(errorMessage);
    }
  }

  /**
   * Force stop current playback (for emergency pre-emption).
   * Returns the fade-out duration so the caller can wait before starting new audio.
   * @returns {number} Fade-out duration in ms
   */
  forceStop() {
    this._isPlaying = false;
    return this._fadeMs;
  }

  /**
   * Get the current audio configuration (sent to client for Web Speech API).
   * @returns {{ volume: number, fadeMs: number, deviceId: string|null }}
   */
  getConfig() {
    return {
      volume: this._volume,
      fadeMs: this._fadeMs,
      deviceId: this._deviceId
    };
  }
}

// Singleton instance
export const audioManager = new AudioManager();
