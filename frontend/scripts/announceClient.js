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

  /** @type {number} Speech playback speed rate (0.5–1.5) */
  speechRate: 0.85,

  /** @type {number} Voice pitch (0.5–1.5) */
  speechPitch: 1.0,

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
    if (stored) return stored.replace(/\/$/, '');

    // Pure local offline kiosk mode (no remote database delays)
    return '';
  },

  init() {
    // Non-blocking asynchronous Socket.IO connection in background
    setTimeout(() => {
      if (typeof io !== 'undefined' && !this.socket) {
        try {
          const backendUrl = this.getBackendUrl();
          this.socket = backendUrl
            ? io(backendUrl, { timeout: 4000, autoConnect: true, reconnectionAttempts: 3 })
            : io({ timeout: 4000 });

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
        } catch (err) {
          console.warn('Socket connection deferred:', err);
        }
      }
    }, 100);
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

    let url = data.synthesis.audioUrl;
    if (url && url.startsWith('/')) {
      url = `${this.getBackendUrl()}${url}`;
    }

    const audio = new Audio(url);
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

  playQueue: [],
  isPlayingQueue: false,

  /** @type {AudioContext|null} Web Audio API context for 100% seamless 0ms merging */
  audioCtx: null,
  chimeBufferCache: null,
  currentWebAudioSource: null,

  getAudioContext() {
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.audioCtx = new AudioCtx();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  },

  async loadAudioBuffer(url) {
    const ctx = this.getAudioContext();
    if (!ctx) return null;
    try {
      const response = await fetch(url);
      if (!response.ok) return null;
      const arrayBuffer = await response.arrayBuffer();
      return await ctx.decodeAudioData(arrayBuffer);
    } catch (err) {
      console.warn('Failed to load/decode audio buffer:', url, err);
      return null;
    }
  },

  /**
   * Play Railway Chime + Announcement Voice fused seamlessly together with 0ms gap.
   * @param {string} announcementUrl
   * @param {string} text
   * @param {Object} nextData
   * @returns {Promise<void>}
   */
  async playMergedAudio(announcementUrl, text, nextData) {
    const ctx = this.getAudioContext();
    const chimeEnabled = localStorage.getItem('cafe_play_chime') !== 'false';
    const chimeUrl = window.location.origin + '/audio_clips/chime.mp3';

    const queueText = document.getElementById('queueText');
    if (queueText) {
      queueText.textContent = `🔊 Playing: ${text}`;
      queueText.classList.add('playing');
    }

    if (ctx) {
      try {
        let chimeBuffer = null;
        if (chimeEnabled) {
          if (!this.chimeBufferCache) {
            this.chimeBufferCache = await this.loadAudioBuffer(chimeUrl);
          }
          chimeBuffer = this.chimeBufferCache;
        }

        const voiceBuffer = await this.loadAudioBuffer(announcementUrl);

        if (voiceBuffer) {
          return new Promise((resolve) => {
            const now = ctx.currentTime;
            let chimeDuration = 0;

            if (chimeBuffer) {
              const chimeSource = ctx.createBufferSource();
              chimeSource.buffer = chimeBuffer;

              const chimeGain = ctx.createGain();
              chimeGain.gain.value = this.volume;

              chimeSource.connect(chimeGain);
              chimeGain.connect(ctx.destination);

              chimeSource.start(now);
              chimeDuration = chimeBuffer.duration;
            }

            const voiceSource = ctx.createBufferSource();
            voiceSource.buffer = voiceBuffer;
            voiceSource.playbackRate.value = this.speechRate;

            const voiceGain = ctx.createGain();
            voiceGain.gain.value = this.volume;

            voiceSource.connect(voiceGain);
            voiceGain.connect(ctx.destination);

            // Micro-overlap (50ms) for a completely merged, continuous station announcement sound
            const overlap = chimeDuration > 0.1 ? 0.05 : 0;
            const voiceStartTime = now + (chimeDuration > 0 ? chimeDuration - overlap : 0);

            voiceSource.start(voiceStartTime);

            this.currentWebAudioSource = voiceSource;

            voiceSource.onended = () => {
              this.currentWebAudioSource = null;
              if (queueText) {
                queueText.textContent = 'Ready';
                queueText.classList.remove('playing');
              }
              resolve();
            };
          });
        }
      } catch (err) {
        console.warn('Web Audio API playback error, falling back to HTML5 audio:', err);
      }
    }

    // Fallback: HTML5 Audio sequential chaining
    return new Promise((resolve) => {
      const playVoice = () => {
        const audio = new Audio(announcementUrl);
        audio.volume = this.volume;
        audio.playbackRate = this.speechRate;
        audio.preservesPitch = true;
        this.currentAudio = audio;

        audio.onended = () => {
          this.currentAudio = null;
          if (queueText) {
            queueText.textContent = 'Ready';
            queueText.classList.remove('playing');
          }
          resolve();
        };

        audio.onerror = () => {
          this.currentAudio = null;
          this.playWebSpeech(nextData);
          setTimeout(resolve, 2000);
        };

        audio.play().catch(() => {
          this.playWebSpeech(nextData);
          setTimeout(resolve, 2000);
        });
      };

      if (chimeEnabled) {
        const chimeAudio = new Audio(chimeUrl);
        chimeAudio.volume = this.volume;
        chimeAudio.onended = playVoice;
        chimeAudio.onerror = playVoice;
        chimeAudio.play().catch(playVoice);
      } else {
        playVoice();
      }
    });
  },

  playQueue: [],
  isPlayingQueue: false,

  /**
   * Enqueue a custom or local announcement object directly for playback.
   * @param {Object} data - { text, audioUrl, synthesis, audioConfig }
   */
  enqueue(data) {
    if (!data) return;
    if (data.audioUrl && !data.synthesis) {
      data.synthesis = { audioUrl: data.audioUrl };
    }
    this.enqueueAudio(data);
  },

  enqueueAudio(data) {
    if (!data) return;
    if (data.audioUrl && !data.synthesis) {
      data.synthesis = { audioUrl: data.audioUrl };
    }
    this.playQueue.push(data);
    this.processPlayQueue();
  },

  async processPlayQueue() {
    if (this.isPlayingQueue || this.playQueue.length === 0) return;
    this.isPlayingQueue = true;

    const nextData = this.playQueue.shift();
    try {
      const audioUrl = nextData.audioUrl || nextData.synthesis?.audioUrl;
      if (audioUrl) {
        let url = audioUrl;
        if (url.startsWith('/audio_clips/')) {
          url = window.location.origin + url;
        } else if (url.startsWith('/') && this.getBackendUrl()) {
          url = `${this.getBackendUrl()}${url}`;
        }
        await this.playMergedAudio(url, nextData.text, nextData);
      } else {
        this.playWebSpeech(nextData);
        await new Promise(r => setTimeout(r, 2500));
      }
    } catch {
      // Continue to next queued item
    } finally {
      this.isPlayingQueue = false;
      if (this.playQueue.length > 0) {
        this.processPlayQueue();
      }
    }
  },

  /**
   * Announce an item by ID. Plays audio directly via non-blocking FIFO queue.
   * @param {number} itemId
   * @param {string} [languageCode]
   * @param {string} [priority='normal']
   * @returns {Promise<Object>}
   */
  /**
   * Announce an item by ID. Plays pre-recorded local MP3 clip instantly (0ms delay)
   * without blocking network or database requests.
   * @param {number} itemId
   * @param {string} [languageCode]
   * @param {string} [priority='normal']
   * @returns {Promise<Object>}
   */
  async announce(itemId, languageCode, priority = 'normal') {
    const activeLangBtn = document.querySelector('.lang-switch__btn.active');
    const lang = languageCode || activeLangBtn?.dataset?.lang || localStorage.getItem('cafe_default_lang') || 'en';

    // Resolve item name from App state for clear display
    let itemName = `Item ${itemId}`;
    if (typeof App !== 'undefined' && App.allItems) {
      const foundItem = App.allItems.find((i) => i.id == itemId);
      if (foundItem) {
        if (lang === 'hi') {
          itemName = foundItem.name_hi || foundItem.name_en;
        } else if (lang === 'bho') {
          itemName = foundItem.name_bho || foundItem.name_hi || foundItem.name_en;
        } else {
          itemName = foundItem.name_en;
        }
      }
    }

    // Determine target local audio clip
    let audioFile = `/audio_clips/item_${itemId}_${lang}.mp3`;
    if (itemId == 8 && lang === 'bho') {
      audioFile = `/audio_clips/item_8_hi.mp3`;
    }

    // Enqueue for immediate local audio playback (0ms delay!)
    this.enqueue({
      text: itemName,
      audioUrl: audioFile
    });

    // Save to local history
    if (typeof HistoryView !== 'undefined' && HistoryView.addEntry) {
      HistoryView.addEntry({
        item_name: itemName,
        language_code: lang,
        timestamp: new Date().toISOString(),
        status: 'played'
      });
    }

    return { success: true, local: true };
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

    const result = await response.json();
    if (result.success && result.data) {
      this.enqueueAudio(result.data);
    }
    return result;
  },

  /**
   * Cancel queued announcements.
   * @param {string} [queueId] - Cancel specific entry
   * @param {boolean} [all=false] - Cancel all entries
   * @returns {Promise<Object>}
   */
  async cancel(queueId, all = false) {
    // Immediately stop local client playback and clear local play queue
    if (all || !queueId) {
      this.playQueue = [];
      this.stopPlayback();
    }

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
    // Emergency clears existing queue and stops playing audio
    this.playQueue = [];
    this.stopPlayback();

    const response = await fetch(`${this.getBackendUrl()}/api/announce/emergency`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, languageCode })
    });

    const result = await response.json();
    if (result.success && result.data) {
      this.enqueueAudio(result.data);
    }
    return result;
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
    utterance.rate = this.speechRate;
    utterance.pitch = this.speechPitch;

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

  stopPlayback(fadeMs) {
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio = null;
      } catch {
        // Ignore
      }
    }
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch {
        // Ignore
      }
    }
    this.currentUtterance = null;

    const queueText = document.getElementById('queueText');
    if (queueText) {
      queueText.textContent = 'Ready';
      queueText.classList.remove('playing');
    }
  },

  /**
   * Notify the server that playback has completed.
   */
  async sendPlaybackComplete(data) {
    try {
      await fetch(`${this.getBackendUrl()}/api/announce/playback-complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } catch {
      // Ignore feedback errors
    }
  },

  /**
   * Send playback error report back to server.
   * @param {Object} data
   */
  async sendPlaybackError(data) {
    try {
      await fetch(`${this.getBackendUrl()}/api/announce/playback-error`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } catch {
      // Ignore feedback errors
    }
  },

  /**
   * Set the playback volume.
   * @param {number} vol - 0.0 to 1.0
   */
  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
  },

  /**
   * Set the speech playback speed rate.
   * @param {number} rate - 0.5 to 1.5
   */
  setSpeechRate(rate) {
    this.speechRate = Math.max(0.5, Math.min(2.0, Number(rate) || 0.85));
    if (this.currentAudio) {
      try { this.currentAudio.playbackRate = this.speechRate; } catch {}
    }
  },

  /**
   * Set the voice pitch.
   * @param {number} pitch - 0.5 to 1.5
   */
  setSpeechPitch(pitch) {
    this.speechPitch = Math.max(0.5, Math.min(2.0, Number(pitch) || 1.0));
  }
};
