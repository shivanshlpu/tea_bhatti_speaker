import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initDb, closeDb } from './db/connection.js';
import { seedDatabase } from './db/seed.js';

// Route imports
import itemsRouter from './routes/items.routes.js';
import categoriesRouter from './routes/categories.routes.js';
import announceRouter from './routes/announce.routes.js';
import historyRouter from './routes/history.routes.js';
import settingsRouter from './routes/settings.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: '*' }
});

// --- Middleware ---
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve frontend static files
app.use(express.static(join(__dirname, '..', 'frontend')));

// Serve cached WAV audio files
app.use('/audio-cache', express.static(join(__dirname, '..', 'audio-cache')));

// Serve food menu images and branding logo
app.use('/menu_images', express.static(join(__dirname, '..', 'images', 'menu_images')));
app.use('/images', express.static(join(__dirname, '..', 'images')));

// --- API Routes ---
app.use('/api/items', itemsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/announce', announceRouter);
app.use('/api/history', historyRouter);
app.use('/api/settings', settingsRouter);

// --- Audio devices endpoint (stub — real impl via Electron IPC) ---
app.get('/api/audio-devices', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 'default', label: 'System Default Speaker' }
    ]
  });
});

// --- Health check ---
app.get('/api/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok', uptime: process.uptime() } });
});

// --- Socket.IO ---
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

// Make io accessible to routes for broadcasting
app.set('io', io);

// --- Initialize DB & Seed, then Start Server ---
const PORT = process.env.PORT || 3456;

async function start() {
  try {
    await initDb();
    seedDatabase();
    console.log('✅ Database initialized');
  } catch (err) {
    console.error('❌ Database initialization failed:', err.message);
  }

  server.listen(PORT, () => {
    console.log(`🚀 Cafe Voice System running on http://localhost:${PORT}`);
  });
}

start();

// --- Graceful shutdown ---
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  closeDb();
  server.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  closeDb();
  server.close();
  process.exit(0);
});

export { app, server, io };
