# Cafe Voice Announcement System — Master Development Specification

## 0. How to Use This Document

You are a **Senior Full-Stack Architect, UI/UX Designer, Node.js Engineer, AI/TTS Integration Engineer, DevOps Engineer, and QA Engineer** building this system end-to-end.

Rules of engagement:
1. Do not skip sections. Do not write code until the relevant section's documentation (feature → architecture → algorithm → folder → files → dependencies → edge cases → tests) is explicitly acknowledged.
2. Work phase by phase, in order (Section 10). Each phase ends with a checklist — do not start the next phase until every box is checked.
3. When a decision has multiple valid options (e.g. TTS engine), state the tradeoff and the recommendation, then proceed with the recommendation unless told otherwise.
4. Treat this as production/enterprise software for a live kitchen environment — reliability and speed matter more than feature count.

---

## 1. Project Goal & Scope

**One-line goal:** A staff member taps one button when an item is ready → a natural human voice announces it over the cafe speaker system, in under 1 second, every time, with zero customer-facing surface area.

### In Scope
- Staff-facing tablet/kiosk UI (touch-first, kitchen-safe: grease/wet-finger tolerant, big targets)
- Local TTS voice generation (no per-announcement API cost, must work fully offline)
- FIFO announcement queue with priority/emergency override
- Multi-language announcements: English, Hindi, Bhojpuri
- Local SQLite persistence (items, categories, history, settings)
- Electron desktop packaging for a dedicated in-store PC/tablet

### Explicitly Out of Scope (v1)
- Customer-facing app, QR ordering, token numbers, kiosk self-service
- Payment processing
- Cloud sync / multi-store sync (deferred — see Section 11)
- Login/multi-user auth (single shared staff device, no per-user accounts in v1)

### Non-negotiable Constraints
- **Tap-to-audio latency budget: ≤ 800ms** (button press → first audio sample plays)
- Must run fully offline after initial setup (no internet dependency for core loop)
- Must recover automatically from: speaker disconnect, audio device busy, DB lock, TTS engine crash
- Must run on modest hardware: a $150–250 Android tablet-class device or a low-end mini-PC (4GB RAM, no GPU)

---

## 2. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | HTML5 + CSS3 + Vanilla JS (no framework) | Zero build-step fragility on kitchen hardware; instant reload; smallest attack surface |
| Backend | Node.js 20 LTS + Express 4 | Simple, well-understood, easy Electron embed |
| Realtime | Socket.IO | Not needed for single-device v1, but wires the app for Section 11 (multi-speaker/remote control) without a rewrite |
| DB | SQLite (via `better-sqlite3`) | Zero-config, synchronous, embeds directly in the Electron process, no network dependency |
| TTS | Local neural TTS (engine selected in Section 6) | Must be offline-capable and fast on CPU |
| Packaging | Electron (latest stable) | Single installable app, direct access to system audio devices |
| Process manager (dev) | `nodemon` | Fast iteration |

---

## 3. System Architecture

### 3.1 High-Level Flow

```
[Staff taps item card]
        ↓
[UI: dispatch announce(itemId, lang)]
        ↓
[Renderer → IPC/HTTP → Express API]
        ↓
[QueueManager.enqueue(announcement)]
        ↓
[QueueManager checks: is anything playing?]
   ├─ No  → AudioManager.play() immediately
   └─ Yes → hold in FIFO (or jump queue if priority/emergency)
        ↓
[TTSEngine.synthesize(text, lang, voice)]
   ├─ Cache hit  → skip synthesis, use cached .wav
   └─ Cache miss → synthesize → save to cache → play
        ↓
[AudioManager: fade-in → play → fade-out]
        ↓
[HistoryStore.log(announcement, timestamp, status)]
        ↓
[QueueManager: pop next item, repeat]
```

### 3.2 Folder Structure

```
cafe-voice-system/
├── electron/
│   ├── main.js                # Electron main process: window, audio device access, tray icon
│   └── preload.js             # Secure IPC bridge (contextBridge) between renderer and main
│
├── backend/
│   ├── server.js               # Express app bootstrap, mounts routes, starts Socket.IO
│   ├── db/
│   │   ├── schema.sql          # Table definitions (Section 4)
│   │   ├── seed.js             # Default categories/items/languages seed script
│   │   └── connection.js       # better-sqlite3 singleton connection
│   ├── routes/
│   │   ├── items.routes.js     # CRUD for menu items
│   │   ├── categories.routes.js
│   │   ├── announce.routes.js  # POST /announce, /repeat, /cancel, /emergency
│   │   ├── history.routes.js   # GET history, filters
│   │   └── settings.routes.js  # GET/PUT app settings (voice, volume, theme, language default)
│   ├── services/
│   │   ├── ttsEngine.js        # Wraps chosen TTS engine (Section 6), exposes synthesize(text, lang)
│   │   ├── audioCache.js       # Hash(text+lang+voice) → cached .wav lookup/store
│   │   ├── queueManager.js     # FIFO + priority/emergency queue logic (Section 7)
│   │   ├── audioManager.js     # Playback, fade in/out, volume, device selection (Section 8)
│   │   └── historyService.js   # Write-through logger for every announcement
│   └── sockets/
│       └── index.js            # Socket.IO handlers (future remote-trigger support)
│
├── frontend/
│   ├── index.html               # Main kitchen screen shell
│   ├── styles/
│   │   ├── tokens.css           # Design tokens: colors, spacing, type scale (Section 9)
│   │   ├── light.css
│   │   └── dark.css
│   ├── scripts/
│   │   ├── app.js               # Boot: fetch categories/items, render grid, wire events
│   │   ├── announceClient.js    # Calls backend /announce, /repeat, /cancel
│   │   ├── search.js            # Client-side fuzzy filter over loaded items
│   │   ├── favorites.js         # LocalStorage-backed favorites (device-local, not per-user)
│   │   ├── settingsPanel.js     # Theme toggle, language toggle, volume slider
│   │   └── historyView.js       # Renders announcement history list
│   └── components/
│       ├── ItemCard.js          # Renders one tappable item card
│       ├── CategoryTabs.js
│       └── Toast.js             # Non-blocking "Announced ✓" / error toast
│
├── tts-runtime/                  # Local TTS engine binaries/models live here (gitignored, downloaded in setup)
│   └── voices/                   # Per-language voice model files
│
├── audio-cache/                  # Generated .wav cache, keyed by content hash (gitignored)
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── stress/
│
├── package.json
├── electron-builder.json         # Packaging config
└── prompt.md                     # This file
```

**File responsibility rule:** every file above owns exactly one concern. `queueManager.js` never touches audio devices directly; `audioManager.js` never decides ordering. This boundary is what makes Section 7/8 testable in isolation.

---

## 4. Data Model (SQLite)

```sql
-- Categories: e.g. "Burgers", "Beverages", "Snacks"
CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  icon TEXT,
  sort_order INTEGER DEFAULT 0
);

-- Items: the tappable menu entries
CREATE TABLE items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL REFERENCES categories(id),
  name_en TEXT NOT NULL,
  name_hi TEXT,
  name_bho TEXT,
  is_favorite INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1
);

-- Languages supported (extensible without code changes)
CREATE TABLE languages (
  code TEXT PRIMARY KEY,        -- 'en', 'hi', 'bho'
  label TEXT NOT NULL,
  voice_model TEXT NOT NULL,    -- filename/id of TTS voice model to use
  is_default INTEGER DEFAULT 0
);

-- App-wide settings, single-row table
CREATE TABLE settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  theme TEXT DEFAULT 'light',       -- 'light' | 'dark'
  default_language TEXT DEFAULT 'en',
  volume REAL DEFAULT 0.9,          -- 0.0–1.0
  fade_ms INTEGER DEFAULT 150,
  repeat_cooldown_ms INTEGER DEFAULT 800,  -- min gap before allowing a repeat of same item
  speaker_device_id TEXT
);

-- Every announcement ever made (for history screen + repeat + debugging)
CREATE TABLE history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER REFERENCES items(id),
  language_code TEXT REFERENCES languages(code),
  text_spoken TEXT NOT NULL,
  status TEXT NOT NULL,          -- 'played' | 'queued' | 'failed' | 'cancelled'
  priority TEXT DEFAULT 'normal',-- 'normal' | 'priority' | 'emergency'
  triggered_at TEXT NOT NULL,    -- ISO timestamp
  played_at TEXT,
  error_message TEXT
);

-- Audio cache index (actual .wav files live on disk; this maps hash → path)
CREATE TABLE audio_cache (
  content_hash TEXT PRIMARY KEY,  -- sha256(text + language_code + voice_model)
  file_path TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_used_at TEXT NOT NULL
);
```

**In-memory (not persisted) — the live queue:**
```js
// One entry per pending announcement, held in queueManager.js
{
  id: string,            // uuid
  itemId: number,
  text: string,
  languageCode: string,
  priority: 'normal' | 'priority' | 'emergency',
  enqueuedAt: number      // epoch ms, used for FIFO ordering + dedup window
}
```

---

## 5. API Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/categories` | List categories with items nested |
| GET | `/api/items?search=` | List/search items |
| POST | `/api/items` | Add item (admin/settings screen) |
| PUT | `/api/items/:id` | Edit item |
| DELETE | `/api/items/:id` | Soft-delete (sets `active=0`) |
| POST | `/api/announce` | Body: `{ itemId, languageCode, priority }` → enqueues |
| POST | `/api/announce/repeat` | Body: `{ historyId }` → re-queues last spoken text |
| POST | `/api/announce/cancel` | Body: `{ queueId }` or `{ all: true }` → clears queue entry/entries |
| POST | `/api/announce/emergency` | Body: `{ text, languageCode }` → jumps queue, bypasses cache if custom text |
| GET | `/api/history?limit=&status=` | Paginated history for History screen |
| GET | `/api/settings` | Fetch current settings |
| PUT | `/api/settings` | Update settings (theme, volume, language, device) |
| GET | `/api/audio-devices` | List available output devices (for speaker selection) |

All responses: `{ success: boolean, data?: any, error?: string }`. All POST/PUT bodies validated server-side before touching the queue — malformed input must never reach `audioManager`.

---

## 6. Voice Engine Selection

| Criteria | Piper TTS | Kokoro TTS | MeloTTS | Coqui TTS |
|---|---|---|---|---|
| Offline | Yes | Yes | Yes | Yes |
| CPU-only inference | Excellent (built for it — ONNX runtime, sub-200ms on CPU) | Good, slightly heavier | Moderate, needs more RAM | Heaviest, torch-based |
| RAM footprint | Very low (~100–300MB per voice) | Low–moderate | Moderate (~1GB+) | High (~1.5–2GB+) |
| Startup time | Fastest | Fast | Slower (model load) | Slowest |
| Hindi voice quality | Good with community/fine-tuned models | Limited native Hindi coverage | Weak Hindi support | Best raw multilingual quality but heavy |
| English voice quality | Very good, natural | Very good, most "expressive" of the four | Good | Very good |
| Bhojpuri | No native model — **strategy: use closest Hindi voice model + phonetic text normalization** (transliterate Bhojpuri text into Hindi-script pronunciation approximations) | Same gap, same strategy | Same gap | Same gap |
| Integration effort | Simple CLI/HTTP wrapper, well-documented | Newer, less battle-tested docs | Python-service wrapper needed | Python-service wrapper needed, most complex |

### Recommendation: **Piper TTS**

Reasoning: this system's hard constraint is **≤800ms tap-to-audio on a $150–250 device with no GPU**. Piper is purpose-built for exactly that (ONNX, CPU-optimized, smallest memory footprint, fastest cold start). Its Hindi voice quality is good enough for short kitchen phrases ("X is ready") where naturalness matters less than clarity and speed. Coqui/MeloTTS produce marginally more expressive speech but cost 5–10x the RAM and startup time — not worth it for one-line announcements.

**Bhojpuri strategy (concrete):** No engine here has a native Bhojpuri model. Since Bhojpuri and Hindi share the Devanagari script and significant phonetic overlap, pre-store each item's Bhojpuri announcement text written in Devanagari with Bhojpuri spelling/grammar (e.g. "वेजी चीज़ बर्गर तैयार बा") and synthesize it through the **Hindi Piper voice model**. This is a text-content solution, not a model-training solution — validate per-item pronunciation manually during Phase 4 and hand-correct any mispronounced item names in the `items.name_bho` field.

**Integration:** Piper runs as a local child process (`child_process.spawn`) invoked by `ttsEngine.js`, receiving text via stdin and voice model path as an arg, returning raw audio via stdout piped to a `.wav` file. Wrap it in a queue-aware promise so `queueManager` never calls it concurrently for two announcements.

---

## 7. Queue Logic

**State machine per announcement:** `queued → synthesizing → playing → done` (or `→ failed` / `→ cancelled` from any state before `done`).

Rules:
- **FIFO by default** — announcements play in the order tapped.
- **No overlap** — `audioManager` exposes `isPlaying()`; `queueManager` never calls `play()` while true.
- **Priority** — a `priority` announcement is inserted after the currently-playing item finishes, ahead of any `normal` items already waiting.
- **Emergency** — an `emergency` announcement pre-empts: if something is playing, fade it out early (200ms) and play the emergency message immediately; it always goes to position 0.
- **Duplicate/spam guard** — if the same `itemId` is tapped again within `repeat_cooldown_ms` (default 800ms) while already queued or playing, ignore the second tap silently (toast: "Already announced") rather than double-queuing.
- **Repeat** — explicit "repeat last" button re-uses the last `history` row's exact spoken text (no re-synthesis needed if still cached).
- **Cancel** — clears one queue entry by id, or the whole queue (`all: true`) — used if staff mis-tapped.

---

## 8. Audio Logic

- **Playback manager**: single active `Audio`/native player instance at a time; every play() call is funneled through one owner (`audioManager`) so nothing can be triggered outside the queue.
- **Volume**: global setting (0.0–1.0), applied at playback time, adjustable live from Settings without restart.
- **Fade in/out**: 150ms default (configurable) linear fade to avoid harsh clipping through cafe speakers — critical because these are usually cheap Bluetooth/wired speakers prone to popping.
- **Repeat delay**: enforced by the cooldown rule in Section 7, not by the audio layer itself.
- **Duplicate detection**: content-hash based (Section 4 `audio_cache`) — same text+language+voice never re-synthesized.
- **Caching**: LRU-style — `last_used_at` updated on every cache hit; a cleanup job (or manual settings action) can purge entries unused for 30+ days to bound disk usage.

---

## 9. UI/UX Specification

### Design Principles (Kitchen-Safe)
- Minimum tap target: **72×72px** — usable with wet/gloved fingers
- High color contrast (WCAG AAA where possible) — kitchen lighting varies wildly
- No hover-dependent interactions — touch only
- Every action gives immediate visual feedback (card flashes/toast) *and* audio feedback — staff shouldn't need to watch the screen to know it worked

### Color Tokens

| Token | Light Mode | Dark Mode | Use |
|---|---|---|---|
| `--bg-primary` | `#FFFDF9` | `#1A1410` | App background |
| `--bg-card` | `#FFFFFF` | `#2B2320` | Item cards |
| `--accent-primary` | `#E8622C` | `#FF7A3D` | Primary action / active state (warm, appetite-triggering) |
| `--accent-success` | `#3F8F5F` | `#4EAE76` | "Announced ✓" confirmation |
| `--accent-emergency` | `#C93838` | `#E24C4C` | Emergency announcement button, always same in both modes |
| `--text-primary` | `#2B2320` | `#F5EFE8` | Main text |
| `--text-secondary` | `#7A6F63` | `#B5AA9E` | Secondary labels |
| `--border` | `#EEE3D6` | `#3A322C` | Card borders/dividers |

No pure black/pure white — deliberately warm-neutral to reduce harshness under kitchen fluorescent lighting.

### Screens (each must be sketched/documented before implementation)
1. **Main Grid** — category tabs across top, item cards below, search bar, language switch, big favorites row pinned first
2. **Settings** — theme toggle, volume slider, speaker device picker, default language, cache size + clear-cache action
3. **History** — reverse-chronological list, filter by status/language, tap-to-repeat from any row
4. **Emergency Panel** — separate, visually distinct (red accent), free-text or preset emergency phrases, confirmation step to prevent mis-taps

---

## 10. Development Phases (Checklist-Driven)

**Phase 1 — Project Initialization**
- [ ] Repo scaffold matching Section 3.2 exactly
- [ ] `package.json` with all deps pinned
- [ ] SQLite schema applied + seed data loaded
- [ ] Electron shell opens a blank window pointing at `frontend/index.html`

**Phase 2 — UI (static, no backend wiring yet)**
- [ ] All 4 screens built with light + dark themes using Section 9 tokens
- [ ] Category tabs + item grid render from a local JSON stub
- [ ] Search + favorites work against the stub data

**Phase 3 — Backend**
- [ ] All Section 5 endpoints implemented and manually tested via curl/Postman
- [ ] Frontend wired to real endpoints, stub data removed

**Phase 4 — Voice**
- [ ] Piper installed and callable from `ttsEngine.js`
- [ ] English + Hindi voice models validated
- [ ] Bhojpuri text strategy applied and manually proofed per item
- [ ] Audio cache read/write working, hash collisions tested

**Phase 5 — Queue**
- [ ] FIFO, priority, emergency, cancel, dedup all implemented per Section 7
- [ ] Manual test: rapid-tap 10 different items, verify correct order, no overlap

**Phase 6 — Testing**
- [ ] Unit tests: queueManager state transitions, audioCache hashing
- [ ] Integration tests: full tap → announce round trip
- [ ] Stress test: 50 taps in 5 seconds, verify no crash, no dropped emergency announcements
- [ ] Manual voice quality pass for every menu item in all 3 languages

**Phase 7 — Packaging**
- [ ] `electron-builder` config produces a working installer
- [ ] Verify offline boot (disconnect internet, app fully functions)
- [ ] Verify audio device selection persists across restarts

**Phase 8 — Deployment**
- [ ] Install on actual target hardware (low-end tablet/mini-PC)
- [ ] Real-speaker test in the actual cafe environment (background noise, distance)
- [ ] Staff walkthrough + sign-off

---

## 11. Coding Standards
- ES Modules throughout, `async/await` (no raw `.then` chains)
- Single-responsibility files (Section 3.2 boundaries are binding, not suggestions)
- SOLID / DRY / KISS — but favor simplicity over abstraction for a system this size; don't build a plugin architecture for a 3-language, 1-device app
- No inline styles in JS — all styling in `styles/*.css` via tokens

---

## 12. Error Handling Matrix

| Failure | Detection | Recovery |
|---|---|---|
| TTS engine crash | `child_process` exit code ≠ 0 or timeout (>2s) | Retry once; on second failure, log to history as `failed`, show toast, fall back to a pre-recorded generic "Order ready" chime if available |
| Speaker disconnected | Playback promise rejects / device error event | Toast staff immediately; queue holds (does not drop) until device reconnects or staff picks new device in Settings |
| DB unavailable/locked | `better-sqlite3` throw on query | Queue continues operating in-memory; writes retried with backoff; surfaced in UI as a non-blocking warning banner |
| App crash | Electron `main` process watchdog | Auto-relaunch via `electron-builder`'s built-in crash reporter + a lightweight restart script |
| Audio device busy (another app holds it) | Playback error on `play()` | Retry after 300ms, up to 3 times, then log `failed` and toast |

---

## 13. Performance Targets

| Metric | Target |
|---|---|
| Cold app startup | < 2s to interactive grid |
| Tap → audio start (cached) | < 300ms |
| Tap → audio start (uncached, cold synthesis) | < 800ms |
| Idle RAM usage | < 250MB |
| Idle CPU usage | Near 0% (event-driven, no polling loops) |

---

## 14. Testing Strategy
- **Unit**: queue ordering logic, cache hashing, settings validation
- **Integration**: full HTTP → queue → TTS → audio path with a mocked audio output
- **Manual**: real-speaker listening test per language per item (this is not skippable — TTS pronunciation errors on proper nouns/menu names are common and only caught by ear)
- **Stress**: burst-tap testing, queue never drops an emergency, never overlaps two audio streams
- **Queue-specific**: verify emergency correctly pre-empts, verify cooldown blocks accidental double-taps

---

## 15. Future Roadmap (Not v1)
- Admin panel with sales/analytics dashboard
- Remote control (trigger announcements from a phone via Socket.IO — infra already stubbed in `backend/sockets/`)
- Cloud sync across multiple store locations
- Multiple simultaneous speaker zones
- Kitchen display screen (parallel visual ticket view)
- POS integration
- Android companion build

---

## 16. Execution Instructions for the Build Agent

Work through Section 10 phase by phase. For each phase, before writing any code:
1. Restate the feature being built in your own words
2. Confirm the architecture piece it maps to (Section 3)
3. Confirm the algorithm/logic (Sections 6–8 where relevant)
4. Confirm which files from Section 3.2 are touched
5. List new dependencies, if any
6. List edge cases from Section 12 that apply
7. State how this phase will be tested (Section 14)

Only after that is stated should implementation begin. Do not jump ahead to a later phase's code.