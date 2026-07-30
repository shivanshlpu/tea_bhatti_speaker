import { Router } from 'express';
import { queryAll, queryOne, runSql } from '../db/connection.js';

const router = Router();

/**
 * GET /api/settings
 * Fetch current app settings (single-row table).
 */
router.get('/', (req, res) => {
  try {
    const settings = queryOne('SELECT * FROM settings WHERE id = 1');

    if (!settings) {
      return res.status(404).json({ success: false, error: 'Settings not initialized' });
    }

    // Also include available languages
    const languages = queryAll('SELECT * FROM languages ORDER BY is_default DESC');

    res.json({ success: true, data: { ...settings, languages } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/settings
 * Update app settings.
 */
router.put('/', (req, res) => {
  try {
    const { theme, default_language, volume, fade_ms, repeat_cooldown_ms, speaker_device_id } = req.body;

    // Validate theme
    if (theme && !['light', 'dark'].includes(theme)) {
      return res.status(400).json({ success: false, error: 'Theme must be "light" or "dark"' });
    }

    // Validate volume
    if (volume !== undefined && (volume < 0 || volume > 1)) {
      return res.status(400).json({ success: false, error: 'Volume must be between 0.0 and 1.0' });
    }

    // Validate language code exists
    if (default_language) {
      const lang = queryOne('SELECT code FROM languages WHERE code = ?', [default_language]);
      if (!lang) {
        return res.status(400).json({ success: false, error: `Unknown language code: ${default_language}` });
      }
    }

    runSql(`
      UPDATE settings SET
        theme = COALESCE(?, theme),
        default_language = COALESCE(?, default_language),
        volume = COALESCE(?, volume),
        fade_ms = COALESCE(?, fade_ms),
        repeat_cooldown_ms = COALESCE(?, repeat_cooldown_ms),
        speaker_device_id = COALESCE(?, speaker_device_id)
      WHERE id = 1
    `, [
      theme ?? null,
      default_language ?? null,
      volume ?? null,
      fade_ms ?? null,
      repeat_cooldown_ms ?? null,
      speaker_device_id ?? null
    ]);

    const updated = queryOne('SELECT * FROM settings WHERE id = 1');
    const languages = queryAll('SELECT * FROM languages ORDER BY is_default DESC');

    res.json({ success: true, data: { ...updated, languages } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
