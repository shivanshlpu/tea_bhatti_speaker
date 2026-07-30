-- Categories: e.g. "Burgers", "Beverages", "Snacks"
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  icon TEXT,
  sort_order INTEGER DEFAULT 0
);

-- Items: the tappable menu entries
CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL REFERENCES categories(id),
  name_en TEXT NOT NULL,
  name_hi TEXT,
  name_bho TEXT,
  image_url TEXT,
  is_favorite INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1
);

-- Languages supported (extensible without code changes)
CREATE TABLE IF NOT EXISTS languages (
  code TEXT PRIMARY KEY,        -- 'en', 'hi', 'bho'
  label TEXT NOT NULL,
  voice_model TEXT NOT NULL,    -- filename/id of TTS voice model to use
  is_default INTEGER DEFAULT 0
);

-- App-wide settings, single-row table
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  theme TEXT DEFAULT 'light',           -- 'light' | 'dark'
  default_language TEXT DEFAULT 'en',
  volume REAL DEFAULT 0.9,              -- 0.0-1.0
  fade_ms INTEGER DEFAULT 150,
  repeat_cooldown_ms INTEGER DEFAULT 800,  -- min gap before allowing a repeat of same item
  speaker_device_id TEXT
);

-- Every announcement ever made (for history screen + repeat + debugging)
CREATE TABLE IF NOT EXISTS history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER REFERENCES items(id),
  language_code TEXT REFERENCES languages(code),
  text_spoken TEXT NOT NULL,
  status TEXT NOT NULL,             -- 'played' | 'queued' | 'failed' | 'cancelled'
  priority TEXT DEFAULT 'normal',   -- 'normal' | 'priority' | 'emergency'
  triggered_at TEXT NOT NULL,       -- ISO timestamp
  played_at TEXT,
  error_message TEXT
);

-- Audio cache index (actual .wav files live on disk; this maps hash -> path)
CREATE TABLE IF NOT EXISTS audio_cache (
  content_hash TEXT PRIMARY KEY,    -- sha256(text + language_code + voice_model)
  file_path TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_used_at TEXT NOT NULL
);
