import { app, BrowserWindow, Tray, Menu, nativeImage } from 'electron';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { fork } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let mainWindow = null;
let tray = null;
let serverProcess = null;

const SERVER_PORT = 3456;

/**
 * Start the Express backend server as a child process.
 */
function startServer() {
  const serverPath = join(__dirname, '..', 'backend', 'server.js');

  serverProcess = fork(serverPath, [], {
    env: { ...process.env, PORT: SERVER_PORT },
    stdio: 'pipe'
  });

  serverProcess.stdout?.on('data', (data) => {
    console.log(`[server] ${data.toString().trim()}`);
  });

  serverProcess.stderr?.on('data', (data) => {
    console.error(`[server] ${data.toString().trim()}`);
  });

  serverProcess.on('exit', (code) => {
    console.log(`[server] Process exited with code ${code}`);
    // Auto-restart on crash (Section 12: Error Handling)
    if (code !== 0 && code !== null) {
      console.log('[server] Restarting in 2s...');
      setTimeout(startServer, 2000);
    }
  });
}

/**
 * Create the main application window.
 * Configured for kitchen tablet use: large, touch-friendly, no menu bar.
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'Cafe Voice System',
    backgroundColor: '#FFFDF9',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  // Load from the Express server
  mainWindow.loadURL(`http://localhost:${SERVER_PORT}`);

  // Open DevTools in development
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * Create system tray icon for background operation.
 */
function createTray() {
  // Use a simple icon — in production this would be a proper .ico/.png
  tray = new Tray(nativeImage.createEmpty());
  tray.setToolTip('Cafe Voice System');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Window',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        } else {
          createWindow();
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
}

// --- App lifecycle ---

app.whenReady().then(() => {
  startServer();

  // Launch window almost instantly (<200ms) now that Express boots in <50ms
  setTimeout(() => {
    createWindow();
    createTray();
  }, 200);
});

app.on('window-all-closed', () => {
  // Keep running in tray on macOS
  if (process.platform !== 'darwin') {
    // Don't quit — keep running in tray
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
  }
});
