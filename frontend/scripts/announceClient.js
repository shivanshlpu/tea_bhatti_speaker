/**
 * announceClient.js — API client for announcement endpoints.
 * Handles all communication with the backend announce API
 * and Web Speech API synthesis on the client side.
 */

const AnnounceClient = {
  /** @type {SpeechSynthesis} */
  synth: window.speechSynthesis,

  /** @type {SpeechSynthesisUtterance|null} */
  currentUtterance: null,

  /** @type {WebSocket|null} Socket.IO connection */
  socket: null,

  /** @type {number} Current volume (0.0–1.0) */
  volume: 0.9,

  /** @type {number} Fade duration in ms */
  fadeMs: 150,

  /**
   * Get the active backend server URL (supports local server, Render, Railway, or local IP).
   * @returns {string}
   */
  getBackendUrl() {
    const urlParam = new URLSearchParams(window.location.search).get('backend');
    if (urlParam) {
      localStorage.setItem('cafe_backend_url', urlParam);
      return urlParam.replace(/\/$/, '');
    }
    const stored = localStorage.getItem('cafe_backend_url');
    return stored ? stored.replace(/\/$/, '') : '';
  },

  /**
   * Initialize the announce client and Socket.IO connection.
   */
  init() {
    // Connect to Socket.IO (supports remote/local backend server)
    if (typeof io !== 'undefined') {
      const backendUrl = this.getBackendUrl();
      this.socket = backendUrl ? io(backendUrl) : io();

      // Listen for play commands from the server
      this.socket.on('play-announcement', (data) => {
        if (data.synthesis && data.synthesis.audioUrl) {
          this.playAudioFile(data);
        } else {
          this.playWebSpeech(data);
        }
      });

      // Listen for stop commands (emergency pre-empt)
      this.socket.on('stop-playback', (data) => {
        this.stopPlayback(data?.fadeMs || 150);
      });
    }
  },

  /** @type {HTMLAudioElement|null} Currently playing Audio element */
  currentAudio: null,

  /**
   * Play synthesized WAV audio file from local Piper/cache server URL.
   * @param {Object} data - Announcement data from server
   */
  playAudioFile(data) {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }

    const audio = new Audio(data.synthesis.audioUrl);
    audio.volume = data.audioConfig?.volume ?? this.volume;
    this.currentAudio = audio;

    const queueText = document.getElementById('queueText');
    if (queueText) {
      queueText.textContent = `🔊 Playing: ${data.text}`;
      queueText.classList.add('playing');
    }

    audio.onended = () => {
      this.currentAudio = null;
      this.notifyPlaybackComplete();

      if (queueText) {
        queueText.textContent = 'Ready';
        queueText.classList.remove('playing');
      }
    };

    audio.onerror = (err) => {
      this.currentAudio = null;
      console.warn('Audio element error, falling back to Web Speech:', err);
      // Fallback to Web Speech if audio file load fails
      this.playWebSpeech(data);
    };

    audio.play().catch((err) => {
      console.warn('Audio play autoplay blocked/failed, falling back to Web Speech:', err);
      this.playWebSpeech(data);
    });
  },

  /**
   * Announce an item by ID.
   * @param {number} itemId
   * @param {string} [languageCode] - Override language (uses default if not specified)
   * @param {string} [priority='normal']
   * @returns {Promise<Object>}
   */
  async announce(itemId, languageCode, priority = 'normal') {
    const body = { itemId };
    if (languageCode) body.languageCode = languageCode;
    if (priority !== 'normal') body.priority = priority;

    const response = await fetch(`${this.getBackendUrl()}/api/announce`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    return response.json();
  },

  /**
   * Repeat the last announcement.
   * @param {number} [historyId]
   * @returns {Promise<Object>}
   */
  async repeat(historyId) {
    const body = historyId ? { historyId } : {};

    const response = await fetch(`${this.getBackendUrl()}/api/announce/repeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    return response.json();
  },

  /**
   * Cancel queued announcements.
   * @param {string} [queueId] - Cancel specific entry
   * @param {boolean} [all=false] - Cancel all entries
   * @returns {Promise<Object>}
   */
  async cancel(queueId, all = false) {
    const body = all ? { all: true } : { queueId };

    const response = await fetch(`${this.getBackendUrl()}/api/announce/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    return response.json();
  },

  /**
   * Send an emergency announcement.
   * @param {string} text
   * @param {string} [languageCode='en']
   * @returns {Promise<Object>}
   */
  async emergency(text, languageCode = 'en') {
    const response = await fetch(`${this.getBackendUrl()}/api/announce/emergency`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, languageCode })
    });

    return response.json();
  },

  /**
   * Auto-select the highest quality natural human voice available on the system.
   * Prefers Natural/Online/Google neural voices.
   * @param {string} langTag - BCP-47 tag (e.g. 'hi-IN', 'en-IN')
   * @returns {SpeechSynthesisVoice|null}
   */
  getBestNaturalVoice(langTag) {
    if (!this.synth) return null;
    const voices = this.synth.getVoices();
    if (!voices || voices.length === 0) return null;

    const langLower = langTag.toLowerCase().split('-')[0]; // 'hi' or 'en'
    const langVoices = voices.filter(v => v.lang.toLowerCase().includes(langLower));

    if (langVoices.length === 0) return null;

    // Prioritize natural/neural human voices
    const naturalVoice = langVoices.find(v => {
      const name = v.name.toLowerCase();
      return name.includes('natural') || name.includes('online') || name.includes('google') || name.includes('swara') || name.includes('neerja') || name.includes('neural');
    });

    return naturalVoice || langVoices[0];
  },

  /**
   * Play an announcement using the Web Speech API.
   * Called when the server sends a play command via Socket.IO.
   * @param {Object} data - { text, webSpeechLang, audioConfig, queueId }
   */
  playWebSpeech(data) {
    // Cancel any current speech
    this.synth.cancel();

    const utterance = new SpeechSynthesisUtterance(data.text);
    const langTag = data.webSpeechLang || 'hi-IN';
    utterance.lang = langTag;

    const bestVoice = this.getBestNaturalVoice(langTag);
    if (bestVoice) {
      utterance.voice = bestVoice;
    }

    utterance.volume = data.audioConfig?.volume || this.volume;
    utterance.rate = 0.92;  // Warm, unhurried human conversational cadence
    utterance.pitch = 1.05; // Warm welcoming tone

    this.currentUtterance = utterance;

    // Update queue bar to show "playing" state
    const queueText = document.getElementById('queueText');
    if (queueText) {
      queueText.textContent = `🔊 Playing: ${data.text}`;
      queueText.classList.add('playing');
    }

    utterance.onend = () => {
      this.currentUtterance = null;
      // Notify server that playback is complete
      this.notifyPlaybackComplete();

      if (queueText) {
        queueText.textContent = 'Ready';
        queueText.classList.remove('playing');
      }
    };

    utterance.onerror = (event) => {
      this.currentUtterance = null;
      console.error('Speech synthesis error:', event.error);
      this.notifyPlaybackError(event.error);

      if (queueText) {
        queueText.textContent = 'Ready';
        queueText.classList.remove('playing');
      }
    };

    this.synth.speak(utterance);
  },

  /**
   * Stop current playback (for emergency pre-empt).
   * @param {number} fadeMs
   */
  stopPlayback(fadeMs) {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
    this.synth.cancel();
    this.currentUtterance = null;
  },

  /**
   * Notify the server that playback has completed.
   */
  async notifyPlaybackComplete() {
    try {
      await fetch('/api/announce/playback-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
    } catch (err) {
      console.error('Failed to notify playback complete:', err);
    }
  },

  /**
   * Notify the server that playback has failed.
   * @param {string} error
   */
  async notifyPlaybackError(error) {
    try {
      await fetch('/api/announce/playback-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error })
      });
    } catch (err) {
      console.error('Failed to notify playback error:', err);
    }
  },

  /**
   * Set the playback volume.
   * @param {number} vol - 0.0 to 1.0
   */
  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
  }
};
