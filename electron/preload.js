const { contextBridge, ipcRenderer } = require('electron');

/**
 * Secure IPC bridge between Electron renderer and main process.
 * Exposes only safe, explicitly-defined APIs via contextBridge.
 */
contextBridge.exposeInMainWorld('electronAPI', {
  // Platform info
  platform: process.platform,
  isElectron: true,

  // Audio device access (delegated to main process)
  getAudioDevices: () => ipcRenderer.invoke('get-audio-devices'),
  setAudioDevice: (deviceId) => ipcRenderer.invoke('set-audio-device', deviceId),

  // App control
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  toggleFullscreen: () => ipcRenderer.send('window-toggle-fullscreen'),

  // Listen for events from main process
  onAudioDeviceChange: (callback) => {
    ipcRenderer.on('audio-device-changed', (event, data) => callback(data));
  }
});
