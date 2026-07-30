/**
 * Socket.IO event handlers.
 * Currently stubbed for future remote-trigger support (Section 11/15).
 *
 * Events handled:
 *  - connection/disconnect logging
 *  - playback-started: client reports it began playing
 *  - playback-complete: client reports it finished playing
 *  - playback-error: client reports a playback failure
 *
 * Events emitted (by announce.routes.js):
 *  - play-announcement: tells client to synthesize+play
 *  - stop-playback: tells client to fade-stop (emergency pre-empt)
 */

export function setupSocketHandlers(io, audioManager) {
  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    socket.on('playback-started', () => {
      audioManager.markPlaybackStarted();
    });

    socket.on('playback-complete', () => {
      audioManager.markPlaybackComplete();
    });

    socket.on('playback-error', (data) => {
      audioManager.markPlaybackFailed(data?.error || 'Unknown client error');
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });
}
