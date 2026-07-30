import { Router } from 'express';
import { queryOne } from '../db/connection.js';
import { queueManager } from '../services/queueManager.js';
import { audioManager } from '../services/audioManager.js';
import { getAnnouncementTextAsync, prepareSynthesisAsync, getWebSpeechLang } from '../services/ttsEngine.js';
import { getLastAnnouncement } from '../services/historyService.js';

const router = Router();

// Wire queue manager to audio manager
queueManager.onReadyToPlay = async (entry) => {
  entry.state = 'playing';
  audioManager.markPlaybackStarted();

  // Broadcast to connected clients via Socket.IO
  const io = router._app?.get?.('io');
  if (io) {
    const synthesis = await prepareSynthesisAsync(entry.text, entry.languageCode);
    io.emit('play-announcement', {
      queueId: entry.id,
      text: entry.text,
      languageCode: entry.languageCode,
      webSpeechLang: getWebSpeechLang(entry.languageCode),
      priority: entry.priority,
      audioConfig: audioManager.getConfig(),
      synthesis
    });
  }
};

queueManager.onEmergencyPreempt = () => {
  const fadeMs = audioManager.forceStop();
  const io = router._app?.get?.('io');
  if (io) {
    io.emit('stop-playback', { fadeMs });
  }

  // After fade, play next (which is the emergency)
  setTimeout(() => {
    queueManager.markDone();
  }, fadeMs + 50);
};

audioManager.onPlaybackComplete = () => {
  queueManager.markDone();
};

audioManager.onPlaybackError = (errorMessage) => {
  queueManager.markFailed(errorMessage);
};

/**
 * POST /api/announce
 * Enqueue a new announcement.
 * Body: { itemId, languageCode?, priority? }
 */
router.post('/', async (req, res) => {
  try {
    const { itemId, languageCode, priority } = req.body;

    if (!itemId) {
      return res.status(400).json({ success: false, error: 'itemId is required' });
    }

    // Get default language if not specified
    let lang = languageCode;
    if (!lang) {
      const settings = queryOne('SELECT default_language FROM settings WHERE id = 1');
      lang = settings?.default_language || 'en';
    }

    // Get announcement text
    const text = await getAnnouncementTextAsync(itemId, lang);
    if (!text) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }

    // Store app reference for Socket.IO access
    router._app = req.app;

    const result = queueManager.enqueue({
      itemId: Number(itemId),
      text,
      languageCode: lang,
      priority: priority || 'normal'
    });

    if (!result.success) {
      return res.json({ success: false, error: result.error });
    }

    // Pre-synthesize audio so the client can play it directly from HTTP response
    const synthesis = await prepareSynthesisAsync(text, lang, Number(itemId));

    res.json({
      success: true,
      data: {
        queueId: result.id,
        historyId: result.historyId,
        text,
        languageCode: lang,
        synthesis,
        webSpeechLang: getWebSpeechLang(lang),
        queueState: queueManager.getState()
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/announce/repeat
 * Re-queue the last spoken announcement.
 * Body: { historyId? } (optional — defaults to most recent)
 */
router.post('/repeat', async (req, res) => {
  try {
    const { historyId } = req.body;
    let entry;

    if (historyId) {
      entry = queryOne('SELECT * FROM history WHERE id = ?', [Number(historyId)]);
    } else {
      entry = getLastAnnouncement();
    }

    if (!entry) {
      return res.status(404).json({ success: false, error: 'No previous announcement to repeat' });
    }

    router._app = req.app;

    const result = queueManager.enqueue({
      itemId: entry.item_id,
      text: entry.text_spoken,
      languageCode: entry.language_code,
      priority: 'normal'
    });

    const synthesis = await prepareSynthesisAsync(entry.text_spoken, entry.language_code, entry.item_id);

    res.json({
      success: true,
      data: {
        queueId: result.id,
        historyId: result.historyId,
        text: entry.text_spoken,
        languageCode: entry.language_code,
        synthesis,
        webSpeechLang: getWebSpeechLang(entry.language_code)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/announce/cancel
 * Cancel a queued announcement or the entire queue.
 * Body: { queueId? } or { all: true }
 */
router.post('/cancel', (req, res) => {
  try {
    const { queueId, all } = req.body;
    const result = queueManager.cancel({ queueId, all });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/announce/emergency
 * Emergency announcement — jumps queue, bypasses cache if custom text.
 * Body: { text, languageCode? }
 */
router.post('/emergency', async (req, res) => {
  try {
    const { text, languageCode = 'en' } = req.body;

    if (!text) {
      return res.status(400).json({ success: false, error: 'Emergency text is required' });
    }

    router._app = req.app;

    const result = queueManager.enqueue({
      itemId: null,
      text,
      languageCode,
      priority: 'emergency'
    });

    const synthesis = await prepareSynthesisAsync(text, languageCode);

    res.json({
      success: true,
      data: {
        queueId: result.id,
        historyId: result.historyId,
        text,
        languageCode,
        priority: 'emergency',
        synthesis,
        webSpeechLang: getWebSpeechLang(languageCode)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/announce/playback-complete
 * Called by the client when a Web Speech API announcement finishes playing.
 */
router.post('/playback-complete', (req, res) => {
  audioManager.markPlaybackComplete();
  res.json({ success: true });
});

/**
 * POST /api/announce/playback-error
 * Called by the client when a Web Speech API announcement fails.
 */
router.post('/playback-error', (req, res) => {
  const { error } = req.body;
  audioManager.markPlaybackFailed(error || 'Unknown playback error');
  res.json({ success: true });
});

/**
 * GET /api/announce/queue
 * Get current queue state.
 */
router.get('/queue', (req, res) => {
  res.json({ success: true, data: queueManager.getState() });
});

export default router;
